import { z } from "zod";

export const MAX_UPLOAD_BYTES = 5_000_000;

export const allowedUploadMimeSchema = z.enum([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);

export const uploadIntentSchema = z.object({
  claimId: z.string().min(1),
  fileName: z.string().trim().min(1).max(255),
  mimeType: allowedUploadMimeSchema,
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

export type UploadIntent = z.infer<typeof uploadIntentSchema>;

export const fileRecordSchema = z.object({
  fileName: z.string(),
  finalizedAt: z.string().datetime().nullable(),
  id: z.string(),
  mimeType: allowedUploadMimeSchema,
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});
export type FileRecord = z.infer<typeof fileRecordSchema>;

export const uploadAuthorizationSchema = z.object({
  expiresAt: z.string().datetime(),
  file: fileRecordSchema,
  headers: z.record(z.string(), z.string()),
  method: z.literal("PUT"),
  url: z.string().url(),
});
export type UploadAuthorization = z.infer<typeof uploadAuthorizationSchema>;

export const downloadAuthorizationSchema = z.object({
  expiresAt: z.string().datetime(),
  url: z.string().url(),
});
export type DownloadAuthorization = z.infer<typeof downloadAuthorizationSchema>;
