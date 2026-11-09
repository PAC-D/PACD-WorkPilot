import type { PoolClient } from "pg";

import { readRuntimeConfig } from "../config.ts";
import { createDatabasePool } from "./pool.ts";

const departments = [
  ["local-administration", "Administration"],
  ["local-operations", "Operations"],
] as const;

const accounts = [
  ["local-super-admin", "LOCAL-001", "local-super-admin", "Local Super Admin", "local-administration", "SUPER_ADMIN"],
  ["local-admin", "LOCAL-002", "local-admin", "Local Admin", "local-operations", "ADMIN"],
  ["local-user", "LOCAL-003", "local-user", "Local User", "local-operations", "USER"],
] as const;

const grants = [
  ["local-grant-user-work-create", "local-user", "work.create.own", "OWN"],
  ["local-grant-user-work-read", "local-user", "work.read.own", "OWN"],
  ["local-grant-user-work-edit", "local-user", "work.edit.own", "OWN"],
  ["local-grant-user-project-read", "local-user", "projects.read.assigned", "PROJECT_MEMBER"],
  ["local-grant-user-project-join", "local-user", "projects.request_join", "OWN"],
  ["local-grant-user-claim-create", "local-user", "claims.create.own", "OWN"],
  ["local-grant-user-claim-read", "local-user", "claims.read.own", "OWN"],
  ["local-grant-user-claim-edit", "local-user", "claims.edit.own", "OWN"],
  ["local-grant-user-request-create", "local-user", "requests.create.own", "OWN"],
  ["local-grant-user-request-read", "local-user", "requests.read.own", "OWN"],
  ["local-grant-admin-dashboard", "local-admin", "dashboard.read.scope", "ALL"],
  ["local-grant-admin-users", "local-admin", "users.read.scope", "ALL"],
  ["local-grant-admin-work", "local-admin", "work.read.scope", "ALL"],
  ["local-grant-admin-claims", "local-admin", "claims.read.scope", "ALL"],
  ["local-grant-admin-requests", "local-admin", "requests.read.scope", "ALL"],
] as const;

const superAdminPermissions = [
  "work.create.own", "work.read.own", "work.edit.own", "work.read.scope",
  "projects.read.assigned", "projects.request_join", "projects.manage", "projects.assign",
  "claims.create.own", "claims.read.own", "claims.edit.own", "claims.read.scope",
  "claims.edit.scope", "claims.review.scope", "claims.approve.scope", "claims.mark_paid.scope",
  "requests.create.own", "requests.read.own", "requests.read.scope", "requests.review.scope",
  "users.read.scope", "users.manage", "roles.manage", "settings.manage", "audit.read",
  "dashboard.read.scope", "reports.export.scope",
] as const;

async function insertSeed(client: PoolClient) {
  for (const [id, name] of departments) {
    await client.query(
      `INSERT INTO departments (department_id, name) VALUES ($1, $2)
       ON CONFLICT (department_id) DO UPDATE SET name = EXCLUDED.name, updated_at = now()`,
      [id, name],
    );
  }
  for (const [sub, employeeCode, username, displayName, departmentId, role] of accounts) {
    await client.query(
      `INSERT INTO accounts
         (account_sub, employee_code, username, display_name, department_id, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (account_sub) DO UPDATE SET
         employee_code = EXCLUDED.employee_code, username = EXCLUDED.username,
         display_name = EXCLUDED.display_name, department_id = EXCLUDED.department_id,
         role = EXCLUDED.role, status = 'ACTIVE', updated_at = now()`,
      [sub, employeeCode, username, displayName, departmentId, role],
    );
  }
  for (const [grantId, sub, permission, scope] of grants) {
    await client.query(
      `INSERT INTO account_grants (grant_id, account_sub, permission, scope, scope_ids, created_by)
       VALUES ($1, $2, $3, $4, CASE WHEN $4 = 'ALL' THEN ARRAY['ALL']::text[] ELSE '{}'::text[] END, 'local-super-admin')
       ON CONFLICT (grant_id) DO UPDATE SET enabled = true, updated_at = now()`,
      [grantId, sub, permission, scope],
    );
  }
  for (const permission of superAdminPermissions) {
    await client.query(
      `INSERT INTO account_grants (grant_id, account_sub, permission, scope, scope_ids, created_by)
       VALUES ($1, 'local-super-admin', $2, 'ALL', ARRAY['ALL'], 'local-super-admin')
       ON CONFLICT (grant_id) DO UPDATE SET enabled = true, updated_at = now()`,
      [`local-grant-super-${permission.replaceAll(".", "-")}`, permission],
    );
  }
}

const config = readRuntimeConfig();
if (!config.localAuthEnabled || config.nodeEnvironment === "production") {
  throw new Error("Local seed requires LOCAL_AUTH_ENABLED=true outside production");
}

const pool = createDatabasePool(config.database);
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await insertSeed(client);
  await client.query("COMMIT");
  console.log(JSON.stringify({ event: "local_seed_complete", accounts: accounts.length }));
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
