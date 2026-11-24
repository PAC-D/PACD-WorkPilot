import { createHash, randomUUID } from "node:crypto";

import type { DownloadAuthorization, FileRecord, Principal, UploadAuthorization, UploadIntent } from "@pacd/contracts";
import type { Pool, PoolClient } from "pg";

import { DomainError } from "../modules/platform-service.ts";
import type { ObjectStorage, StoredObjectMetadata } from "./s3-storage.ts";

interface FileRow {
  file_id: string;
  file_name: string;
  finalized_at: Date | null;
  mime_type: FileRecord["mimeType"];
  owner_sub: string;
  size_bytes: number;
  storage_key: string;
}

function record(row: FileRow): FileRecord {
  return {
    fileName: row.file_name,
    finalizedAt: row.finalized_at?.toISOString() ?? null,
    id: row.file_id,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
  };
}

export function matchesAuthorizedMetadata(
  expected: { mimeType: string; sizeBytes: number },
  actual: { contentLength: number; contentType: string },
): boolean {
  return actual.contentLength === expected.sizeBytes && actual.contentType === expected.mimeType;
}

export function matchesFileExtension(fileName:string,mimeType:string):boolean{
  const extension=fileName.toLowerCase().split(".").at(-1);
  return extension===(mimeType==="application/pdf"?"pdf":mimeType==="image/png"?"png":mimeType==="image/jpeg"?"jpg":mimeType==="application/vnd.openxmlformats-officedocument.wordprocessingml.document"?"docx":"__invalid__") ||
    (mimeType==="image/jpeg"&&extension==="jpeg");
}

export class FileService {
  private readonly pool: Pool;
  private readonly storage: ObjectStorage;

  constructor(pool: Pool, storage: ObjectStorage) {
    this.pool = pool;
    this.storage = storage;
  }

  async authorizeUpload(actor: Principal, input: UploadIntent, idempotencyKey: string, requestId: string): Promise<UploadAuthorization> {
    if(!matchesFileExtension(input.fileName,input.mimeType))throw new DomainError("CONFLICT","File extension and type must match");
    const isClaim="claimId" in input;
    if (!actor.permissions.includes(isClaim?"claims.edit.own":"requests.create.own")) throw new DomainError("FORBIDDEN", "Access denied");
    if (!idempotencyKey) throw new DomainError("CONFLICT", "Idempotency-Key is required");
    const requestHash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    const existing = await this.pool.query<{ request_hash: string; response_body: UploadAuthorization }>(
      "SELECT request_hash,response_body FROM idempotency_records WHERE actor_sub=$1 AND route=$2 AND idempotency_key=$3 AND expires_at>now()",
      [actor.id, "/files/presign-upload", idempotencyKey],
    );
    if (existing.rows[0]) {
      if (existing.rows[0].request_hash !== requestHash) {
        throw new DomainError("CONFLICT", "Idempotency key was reused with a different request");
      }
      return existing.rows[0].response_body;
    }
    const targetId=isClaim?input.claimId:input.requestId;
    const target = await this.pool.query(
      isClaim?"SELECT 1 FROM claims WHERE claim_id=$1 AND user_sub=$2 AND status IN ('DRAFT','NEEDS_INFO')":"SELECT 1 FROM requests WHERE request_id=$1 AND requester_sub=$2 AND status IN ('DRAFT','NEEDS_INFO')",
      [targetId, actor.id],
    );
    if (!target.rowCount) throw new DomainError("NOT_FOUND", "Editable record not found");
    const id = `fil_${randomUUID()}`;
    const key = `${isClaim?"claims":"requests"}/${actor.id}/${id}`;
    const grant = await this.storage.authorizeUpload(key, input.mimeType, input.sizeBytes);
    const data: UploadAuthorization = {
      expiresAt: grant.expiresAt,
      file: { fileName: input.fileName, finalizedAt: null, id, mimeType: input.mimeType, sizeBytes: input.sizeBytes },
      headers: { ...grant.headers },
      method: "PUT",
      url: grant.url,
    };
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "INSERT INTO files (file_id,owner_sub,file_name,mime_type,size_bytes,storage_key) VALUES ($1,$2,$3,$4,$5,$6)",
        [id, actor.id, input.fileName, input.mimeType, input.sizeBytes, key],
      );
      await client.query(isClaim?"INSERT INTO claim_files (claim_id,file_id) VALUES ($1,$2)":"INSERT INTO request_files (request_id,file_id) VALUES ($1,$2)", [targetId, id]);
      await this.audit(client, actor, "file.upload_authorized", id, data.file, requestId);
      await client.query(
        "INSERT INTO idempotency_records (actor_sub,route,idempotency_key,request_hash,response_status,response_body,expires_at) VALUES ($1,$2,$3,$4,201,$5,$6)",
        [actor.id, "/files/presign-upload", idempotencyKey, requestHash, JSON.stringify(data), data.expiresAt],
      );
      await client.query("COMMIT");
      return data;
    } catch (error) {
      await client.query("ROLLBACK");
      await this.storage.delete(key).catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async finalize(actor: Principal, id: string, idempotencyKey: string, requestId: string): Promise<FileRecord> {
    if (!idempotencyKey) throw new DomainError("CONFLICT", "Idempotency-Key is required");
    const row = await this.ownedFile(actor, id);
    if (row.finalized_at) return record(row);
    let metadata: StoredObjectMetadata;
    try {
      metadata = await this.storage.metadata(row.storage_key);
    } catch {
      throw new DomainError("CONFLICT", "The authorized upload has not completed");
    }
    if (!matchesAuthorizedMetadata({ mimeType: row.mime_type, sizeBytes: row.size_bytes }, metadata)) {
      await this.storage.delete(row.storage_key).catch(() => undefined);
      throw new DomainError("CONFLICT", "Uploaded file metadata does not match the authorized upload");
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked=await client.query<FileRow>("SELECT * FROM files WHERE file_id=$1 AND owner_sub=$2 FOR UPDATE",[id,actor.id]);
      if(!locked.rows[0])throw new DomainError("NOT_FOUND","File not found");
      if(locked.rows[0].finalized_at){await client.query("COMMIT");return record(locked.rows[0]);}
      const target=await client.query<{entity_id:string;kind:"claim"|"request"}>(`SELECT claim_id entity_id,'claim' kind FROM claim_files WHERE file_id=$1
        UNION ALL SELECT request_id entity_id,'request' kind FROM request_files WHERE file_id=$1`,[id]);
      const linked=target.rows[0];if(!linked)throw new DomainError("NOT_FOUND","Attachment target not found");
      const changed=linked.kind==="claim"
        ?await client.query<{version:number}>("UPDATE claims SET version=version+1,updated_at=now() WHERE claim_id=$1 AND user_sub=$2 AND status IN ('DRAFT','NEEDS_INFO') RETURNING version",[linked.entity_id,actor.id])
        :await client.query<{version:number}>("UPDATE requests SET version=version+1,updated_at=now() WHERE request_id=$1 AND requester_sub=$2 AND status IN ('DRAFT','NEEDS_INFO') RETURNING version",[linked.entity_id,actor.id]);
      if(!changed.rows[0])throw new DomainError("CONFLICT","Attachment target is no longer editable");
      const updated = await client.query<FileRow>(
        "UPDATE files SET finalized_at=now() WHERE file_id=$1 AND owner_sub=$2 AND finalized_at IS NULL RETURNING *",
        [id, actor.id],
      );
      const finalRow = updated.rows[0] ?? row;
      const data = record(finalRow);
      await this.audit(client, actor, "file.finalized", id, data, requestId);
      await client.query("INSERT INTO outbox_events (event_id,event_type,entity_id,scope,entity_version) VALUES ($1,$2,$3,$4,$5)",[`evt_${randomUUID()}`,linked.kind==="claim"?"CLAIM_CHANGED":"REQUEST_CHANGED",linked.entity_id,`user:${actor.id}`,changed.rows[0].version]);
      await client.query("COMMIT");
      return data;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async authorizeDownload(actor: Principal, id: string): Promise<DownloadAuthorization> {
    const result = await this.pool.query<FileRow>(
      `SELECT f.* FROM files f LEFT JOIN claim_files cf ON cf.file_id=f.file_id LEFT JOIN claims c ON c.claim_id=cf.claim_id
       LEFT JOIN request_files rf ON rf.file_id=f.file_id LEFT JOIN requests r ON r.request_id=rf.request_id
       WHERE f.file_id=$1 AND f.finalized_at IS NOT NULL AND (f.owner_sub=$2 OR ($3::boolean AND c.claim_id IS NOT NULL AND can_access_account($2,c.user_sub,'claims.read.scope')) OR ($4::boolean AND r.request_id IS NOT NULL AND can_access_account($2,r.requester_sub,'requests.read.scope')))`,
      [id, actor.id, actor.permissions.includes("claims.read.scope"),actor.permissions.includes("requests.read.scope")],
    );
    const row = result.rows[0];
    if (!row) throw new DomainError("NOT_FOUND", "File not found");
    return this.storage.authorizeDownload(row.storage_key);
  }

  private async ownedFile(actor: Principal, id: string): Promise<FileRow> {
    const result = await this.pool.query<FileRow>(`SELECT f.* FROM files f
      LEFT JOIN claim_files cf ON cf.file_id=f.file_id LEFT JOIN claims c ON c.claim_id=cf.claim_id
      LEFT JOIN request_files rf ON rf.file_id=f.file_id LEFT JOIN requests r ON r.request_id=rf.request_id
      WHERE f.file_id=$1 AND f.owner_sub=$2 AND (
        f.finalized_at IS NOT NULL OR c.status IN ('DRAFT','NEEDS_INFO') OR r.status IN ('DRAFT','NEEDS_INFO')
      )`, [id, actor.id]);
    const row = result.rows[0];
    if (!row) throw new DomainError("NOT_FOUND", "File not found");
    return row;
  }

  private async audit(client: PoolClient, actor: Principal, action: string, id: string, state: unknown, requestId: string) {
    await client.query(
      "INSERT INTO audit_records (audit_id,actor_sub,action,resource_type,resource_id,new_state,request_id,permission_policy_version) VALUES ($1,$2,$3,'file',$4,$5,$6,$7)",
      [`aud_${randomUUID()}`, actor.id, action, id, JSON.stringify(state), requestId, actor.policyVersion],
    );
  }
}
