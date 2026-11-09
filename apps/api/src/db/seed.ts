import type { PoolClient } from "pg";

import { readRuntimeConfig } from "../config.ts";
import { createDatabasePool } from "./pool.ts";

const departments = [
  ["local-administration", "Administration"],
  ["local-operations", "Operations"],
] as const;

const accounts = [
  ["local-super-admin", "LOCAL-001", "superadmin", "Local Super Admin", "superadmin@pacd", "local-administration", "SUPER_ADMIN"],
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
  await client.query("UPDATE accounts SET status = 'DISABLED', updated_at = now() WHERE account_sub IN ('local-admin', 'local-user')");
  for (const [id, name] of departments) {
    await client.query(
      `INSERT INTO departments (department_id, name) VALUES ($1, $2)
       ON CONFLICT (department_id) DO UPDATE SET name = EXCLUDED.name, updated_at = now()`,
      [id, name],
    );
  }
  for (const [sub, employeeCode, username, displayName, email, departmentId, role] of accounts) {
    await client.query(
      `INSERT INTO accounts
         (account_sub, employee_code, username, display_name, email, department_id, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (account_sub) DO UPDATE SET
         employee_code = EXCLUDED.employee_code, username = EXCLUDED.username,
         display_name = EXCLUDED.display_name, email = EXCLUDED.email, department_id = EXCLUDED.department_id,
         role = EXCLUDED.role, status = 'ACTIVE', updated_at = now()`,
      [sub, employeeCode, username, displayName, email, departmentId, role],
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
