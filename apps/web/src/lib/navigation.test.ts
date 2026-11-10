import assert from "node:assert/strict";
import test from "node:test";

import type { Principal } from "@pacd/contracts";

import { getNavigation, getNavigationPath, hasPermission, resolveRoute } from "./navigation.ts";

const admin: Principal = {
  department: "Operations",
  displayName: "Admin Demo",
  employeeCode: "EMP-014",
  id: "demo-admin",
  permissions: [
    "dashboard.read.scope",
    "users.read.scope",
    "work.read.scope",
    "claims.read.scope",
    "requests.read.scope",
  ],
  policyVersion: 3,
  role: "ADMIN",
};

test("scoped Admin sees reporting areas but no Super Admin areas", () => {
  const ids = getNavigation(admin).map((item) => item.id);

  assert.equal(ids.includes("reports"), true);
  assert.equal(ids.includes("users-access"), false);
  assert.equal(ids.includes("configuration"), false);
  assert.equal(ids.includes("audit"), false);
});

test("read permission does not imply approval permission", () => {
  assert.equal(hasPermission(admin, "claims.read.scope"), true);
  assert.equal(hasPermission(admin, "claims.approve.scope"), false);
});

test("navigation uses stable production-style paths", () => {
  assert.equal(getNavigationPath("overview", admin), "/dashboard");
  assert.equal(getNavigationPath("projects", admin), "/projects");
  assert.equal(getNavigationPath("configuration", admin), null);
});

test("direct routes enforce role and permission visibility", () => {
  assert.deepEqual(resolveRoute("/reports", admin), { kind: "allowed", pageId: "reports" });
  assert.deepEqual(resolveRoute("/admin", admin), { kind: "forbidden" });
  assert.deepEqual(resolveRoute("/settings", admin), { kind: "forbidden" });
  assert.deepEqual(resolveRoute("/missing", admin), { kind: "not-found" });
});

test("root and login redirect authenticated users to dashboard", () => {
  assert.deepEqual(resolveRoute("/", admin), { kind: "redirect", path: "/dashboard" });
  assert.deepEqual(resolveRoute("/login", admin), { kind: "redirect", path: "/dashboard" });
});

