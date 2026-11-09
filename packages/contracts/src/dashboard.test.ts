import assert from "node:assert/strict";
import test from "node:test";

import { permissionSchema, principalSchema, roleSchema } from "./dashboard.ts";

test("accepts only the three contracted roles", () => {
  assert.equal(roleSchema.safeParse("USER").success, true);
  assert.equal(roleSchema.safeParse("ADMIN").success, true);
  assert.equal(roleSchema.safeParse("SUPER_ADMIN").success, true);
  assert.equal(roleSchema.safeParse("MANAGER").success, false);
});

test("rejects invented permissions", () => {
  assert.equal(permissionSchema.safeParse("claims.approve.any").success, false);
});

test("requires an explicit permission list on the principal", () => {
  const result = principalSchema.safeParse({
    id: "demo-user",
    displayName: "Demo User",
    employeeCode: "EMP-001",
    department: "Operations",
    role: "USER",
    policyVersion: 1,
  });

  assert.equal(result.success, false);
});

