import assert from "node:assert/strict";
import test from "node:test";

import { CursorCodec, CursorError } from "./cursor.ts";

test("cursor binds viewer, policy and resource", () => {
  const codec = new CursorCodec("test-secret");
  const cursor = codec.encode({ policyVersion: 2, resource: "projects", sort: ["2026-11-09", "id-1"], viewer: "user-1" });
  assert.deepEqual(codec.decode(cursor, { policyVersion: 2, resource: "projects", viewer: "user-1" }), ["2026-11-09", "id-1"]);
  assert.throws(() => codec.decode(cursor, { policyVersion: 2, resource: "projects", viewer: "user-2" }), CursorError);
});

test("cursor rejects tampering", () => {
  const codec = new CursorCodec("test-secret");
  const cursor = codec.encode({ policyVersion: 1, resource: "claims", sort: ["2026-11", "id-1"], viewer: "user-1" });
  assert.throws(() => codec.decode(`${cursor}x`, { policyVersion: 1, resource: "claims", viewer: "user-1" }), CursorError);
});
