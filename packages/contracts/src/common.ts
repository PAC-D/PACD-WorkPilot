import { z } from "zod";

export const errorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "UPLOAD_TOO_LARGE",
  "THROTTLED",
  "INTERNAL_ERROR",
]);

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    details: z.record(z.string(), z.unknown()).optional(),
    message: z.string().min(1),
    requestId: z.string().min(1),
  }),
});

export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

export const pageSchema = z.object({
  hasMore: z.boolean(),
  limit: z.number().int().min(1).max(100),
  nextCursor: z.string().min(1).nullable(),
});

export const paginationQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const dateOnlySchema = z.iso.date();
export const periodMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM");

export const dateRangeQuerySchema = z
  .object({
    from: dateOnlySchema.optional(),
    to: dateOnlySchema.optional(),
  })
  .refine(({ from, to }) => from === undefined || to === undefined || from <= to, {
    message: "The start date must not be after the end date",
    path: ["to"],
  });
