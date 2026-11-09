import assert from "node:assert/strict";
import test from "node:test";

import type { Principal } from "@pacd/contracts";

import { createApi } from "../app.ts";

const principal: Principal = {
  department: "Administration",
  displayName: "Test User",
  employeeCode: "EMP-001",
  id: "sub-1",
  permissions: ["work.read.own"],
  policyVersion: 1,
  role: "USER",
};

test("GET /me returns the authenticated principal", async () => {
  const response = await createApi({ authenticate: async () => principal }).request("/api/v1/me");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: principal });
});

test("GET /me returns the standard unauthenticated envelope", async () => {
  const response = await createApi({ authenticate: async () => null }).request("/api/v1/me");
  const body = await response.json() as { error: { code: string; requestId: string } };
  assert.equal(response.status, 401);
  assert.equal(body.error.code, "UNAUTHENTICATED");
  assert.equal(body.error.requestId.length > 0, true);
});
