import type { Principal } from "@pacd/contracts";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import type { Pool } from "pg";

import { loadActivePrincipal } from "./principal.ts";

export interface CognitoAuthConfig {
  clientId: string;
  userPoolId: string;
}

export function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
  return match?.[1] ?? null;
}

export function createCognitoAuthenticator(pool: Pool, config: CognitoAuthConfig) {
  const verifier = CognitoJwtVerifier.create({
    clientId: config.clientId,
    tokenUse: "access",
    userPoolId: config.userPoolId,
  });

  return async (request: Request): Promise<Principal | null> => {
    const token = bearerToken(request);
    if (!token) return null;
    try {
      const payload = await verifier.verify(token);
      return loadActivePrincipal(pool, payload.sub);
    } catch {
      return null;
    }
  };
}
