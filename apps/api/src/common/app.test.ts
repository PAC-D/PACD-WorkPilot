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

function testApi(authenticate: () => Promise<Principal | null>) {
  return createApi({ authenticate, webOrigin: "http://127.0.0.1:5173" });
}

test("GET /me returns the authenticated principal", async () => {
  const response = await testApi(async () => principal).request("/api/v1/me");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: principal });
});

test("GET /me returns the standard unauthenticated envelope", async () => {
  const response = await testApi(async () => null).request("/api/v1/me");
  const body = await response.json() as { error: { code: string; requestId: string } };
  assert.equal(response.status, 401);
  assert.equal(body.error.code, "UNAUTHENTICATED");
  assert.equal(body.error.requestId.length > 0, true);
});

test("local browser origin and identity header pass CORS preflight", async () => {
  const response = await testApi(async () => null).request("/api/v1/me", {
    headers: {
      "Access-Control-Request-Headers": "x-workpilot-local-user",
      "Access-Control-Request-Method": "GET",
      Origin: "http://127.0.0.1:5173",
    },
    method: "OPTIONS",
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "http://127.0.0.1:5173");
  assert.match(response.headers.get("access-control-allow-headers") ?? "", /X-WorkPilot-Local-User/i);
  assert.match(response.headers.get("access-control-allow-headers") ?? "", /Authorization/i);
});
