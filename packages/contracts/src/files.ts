import { z } from "zod";

export const MAX_UPLOAD_BYTES = 5_000_000;

export const allowedUploadMimeSchema = z.enum([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);

export const uploadIntentSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: allowedUploadMimeSchema,
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

export type UploadIntent = z.infer<typeof uploadIntentSchema>;
