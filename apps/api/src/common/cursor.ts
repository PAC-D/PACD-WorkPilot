import { createHmac, timingSafeEqual } from "node:crypto";

interface CursorPayload {
  expiresAt: number;
  policyVersion: number;
  resource: string;
  sort: ReadonlyArray<string>;
  viewer: string;
}
export class CursorError extends Error {}

export class CursorCodec {
  private readonly secret: string;
  constructor(secret: string) { this.secret = secret; }

  encode(payload: Omit<CursorPayload, "expiresAt">): string {
    const body = Buffer.from(JSON.stringify({ ...payload, expiresAt: Date.now() + 15 * 60_000 })).toString("base64url");
    const signature = createHmac("sha256", this.secret).update(body).digest("base64url");
    return `${body}.${signature}`;
  }

  decode(cursor: string, expected: Pick<CursorPayload, "policyVersion" | "resource" | "viewer">): ReadonlyArray<string> {
    const [body, signature, extra] = cursor.split(".");
    if (!body || !signature || extra) throw new CursorError("Invalid cursor");
    const expectedSignature = createHmac("sha256", this.secret).update(body).digest();
    const providedSignature = Buffer.from(signature, "base64url");
    if (providedSignature.length !== expectedSignature.length || !timingSafeEqual(providedSignature, expectedSignature)) {
      throw new CursorError("Invalid cursor");
    }
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as CursorPayload;
    if (payload.expiresAt < Date.now()) throw new CursorError("Expired cursor");
    if (payload.viewer !== expected.viewer || payload.resource !== expected.resource || payload.policyVersion !== expected.policyVersion) {
      throw new CursorError("Cursor does not match this query");
    }
    if (!Array.isArray(payload.sort) || payload.sort.some((item) => typeof item !== "string")) throw new CursorError("Invalid cursor");
    return payload.sort;
  }
}
