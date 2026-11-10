import assert from "node:assert/strict";
import test from "node:test";

import { completeNewPasswordInputSchema, dateRangeQuerySchema, MAX_UPLOAD_BYTES, paginationQuerySchema, signInInputSchema, signInOutcomeSchema, uploadIntentSchema } from "./index.ts";

test("sign-in requires both username and password without storing either", () => {
  assert.equal(signInInputSchema.safeParse({ password: "", username: "emp-001" }).success, false);
  assert.equal(signInInputSchema.safeParse({ password: "secret", username: "  " }).success, false);
  assert.equal(signInInputSchema.safeParse({ password: "secret", username: "emp-001" }).success, true);
});

test("first-login challenge requires matching replacement passwords and an opaque session", () => {
  const valid = { confirmPassword: "Replacement1!", newPassword: "Replacement1!" };
  assert.equal(completeNewPasswordInputSchema.safeParse(valid).success, true);
  assert.equal(completeNewPasswordInputSchema.safeParse({ ...valid, confirmPassword: "different" }).success, false);
  assert.equal(completeNewPasswordInputSchema.safeParse({ ...valid, confirmPassword: "short", newPassword: "short" }).success, false);
  assert.equal(signInOutcomeSchema.safeParse({ status: "NEW_PASSWORD_REQUIRED" }).success, true);
});

test("shared pagination defaults to 20 and caps requests at 100", () => {
  assert.equal(paginationQuerySchema.parse({}).limit, 20);
  assert.equal(paginationQuerySchema.safeParse({ limit: 100 }).success, true);
  assert.equal(paginationQuerySchema.safeParse({ limit: 101 }).success, false);
});

test("shared date ranges reject an end before the start", () => {
  assert.equal(dateRangeQuerySchema.safeParse({ from: "2026-11-01", to: "2026-11-30" }).success, true);
  assert.equal(dateRangeQuerySchema.safeParse({ from: "2026-12-01", to: "2026-11-30" }).success, false);
});

test("uploads accept the approved types and reject files over 5 MB", () => {
  const base = { claimId: "claim-1", fileName: "receipt.pdf", mimeType: "application/pdf" };
  assert.equal(uploadIntentSchema.safeParse({ ...base, sizeBytes: MAX_UPLOAD_BYTES }).success, true);
  assert.equal(uploadIntentSchema.safeParse({ ...base, sizeBytes: MAX_UPLOAD_BYTES + 1 }).success, false);
  assert.equal(
    uploadIntentSchema.safeParse({ fileName: "sheet.xlsx", mimeType: "application/vnd.ms-excel", sizeBytes: 10 }).success,
    false,
  );
});
