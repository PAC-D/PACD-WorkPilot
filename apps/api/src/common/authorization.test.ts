import assert from "node:assert/strict";
import test from "node:test";

import type { Principal } from "@pacd/contracts";

import { canAccess, canManageRequest } from "./authorization.ts";

const scopedAdmin: Principal = {
  department: "Operations",
  displayName: "Scoped Admin",
  employeeCode: "EMP-010",
  id: "admin-1",
  permissions: ["claims.read.scope", "claims.approve.scope"],
  policyVersion: 1,
  role: "ADMIN",
};

test("own and other-object checks stay distinct", () => {
  assert.equal(canAccess({ actor: scopedAdmin, ownerId: "admin-1", permission: "claims.read.scope", resourceScope: "OWN" }), true);
  assert.equal(canAccess({ actor: scopedAdmin, ownerId: "user-2", permission: "claims.read.scope", resourceScope: "OWN" }), false);
});

test("scoped access allows only an explicitly listed scope", () => {
  const base = { actor: scopedAdmin, permission: "claims.read.scope" as const, resourceScope: "DEPARTMENT" as const, scopeIds: ["dept-ops"] };
  assert.equal(canAccess({ ...base, resourceScopeId: "dept-ops" }), true);
  assert.equal(canAccess({ ...base, resourceScopeId: "dept-finance" }), false);
});

test("self-approval is denied even with approval permission and all scope", () => {
  assert.equal(canAccess({
    actor: scopedAdmin,
    ownerId: "admin-1",
    permission: "claims.approve.scope",
    resourceScope: "ALL",
    scopeIds: ["ALL"],
    selfApproval: true,
  }), false);
});

test("request management is Super Admin by default and explicit for Admin", () => {
  assert.equal(canManageRequest("USER", true), false);
  assert.equal(canManageRequest("ADMIN", false), false);
  assert.equal(canManageRequest("ADMIN", true), true);
  assert.equal(canManageRequest("SUPER_ADMIN", false), true);
});
