import { randomUUID } from "node:crypto";

import { readRuntimeConfig } from "../config.ts";
import { createDatabasePool } from "./pool.ts";

const permissions = [
  "work.create.own", "work.read.own", "work.edit.own", "work.read.scope",
  "projects.read.assigned", "projects.request_join", "projects.manage", "projects.assign",
  "claims.create.own", "claims.read.own", "claims.edit.own", "claims.read.scope",
  "claims.edit.scope", "claims.review.scope", "claims.approve.scope", "claims.mark_paid.scope",
  "requests.create.own", "requests.read.own", "requests.read.scope", "requests.review.scope",
  "users.read.scope", "users.manage", "roles.manage", "settings.manage", "audit.read",
  "dashboard.read.scope", "reports.export.scope",
] as const;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the one-time bootstrap`);
  return value;
}

const config = readRuntimeConfig();
if (config.nodeEnvironment !== "production" || config.localAuthEnabled) {
  throw new Error("Super Admin bootstrap runs only in hosted production mode");
}

const subject = required("BOOTSTRAP_SUPER_ADMIN_SUB");
const username = required("BOOTSTRAP_SUPER_ADMIN_USERNAME");
const employeeCode = required("BOOTSTRAP_SUPER_ADMIN_EMPLOYEE_CODE");
const displayName = required("BOOTSTRAP_SUPER_ADMIN_DISPLAY_NAME");
const email = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL?.trim() || null;
const departmentId = "administration";
const pool = createDatabasePool(config.database);
const client = await pool.connect();

try {
  await client.query("BEGIN");
  const existing = await client.query<{ count: string }>("SELECT count(*)::text AS count FROM accounts WHERE role = 'SUPER_ADMIN'");
  if (Number(existing.rows[0]?.count ?? 0) !== 0) throw new Error("A Super Admin already exists; bootstrap is one-time only");

  await client.query(
    "INSERT INTO departments (department_id, name) VALUES ($1, $2) ON CONFLICT (department_id) DO NOTHING",
    [departmentId, "Administration"],
  );
  await client.query(
    `INSERT INTO accounts (account_sub, employee_code, username, display_name, email, department_id, role)
     VALUES ($1, $2, $3, $4, $5, $6, 'SUPER_ADMIN')`,
    [subject, employeeCode, username, displayName, email, departmentId],
  );
  for (const permission of permissions) {
    await client.query(
      `INSERT INTO account_grants (grant_id, account_sub, permission, scope, scope_ids, created_by)
       VALUES ($1, $2, $3, 'ALL', ARRAY['ALL'], $2)`,
      [`grant-${randomUUID()}`, subject, permission],
    );
  }
  await client.query(
    `INSERT INTO audit_records
       (audit_id, actor_sub, action, resource_type, resource_id, new_state, reason, request_id, permission_policy_version)
     VALUES ($1, $2, 'account.bootstrap', 'account', $2, $3, 'Initial hosted Super Admin bootstrap', $4, 1)`,
    [`aud_${randomUUID()}`, subject, JSON.stringify({ role: "SUPER_ADMIN", username }), `bootstrap-${randomUUID()}`],
  );
  await client.query(
    `INSERT INTO outbox_events (event_id, event_type, entity_id, scope, entity_version)
     VALUES ($1, 'USER_GRANTS_CHANGED', $2, 'ALL', 1)`,
    [`evt_${randomUUID()}`, subject],
  );
  await client.query("COMMIT");
  console.log(JSON.stringify({ event: "super_admin_bootstrap_complete", username }));
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
