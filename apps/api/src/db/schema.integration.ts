import assert from "node:assert/strict";
import test from "node:test";

import { readRuntimeConfig } from "../config.ts";
import { runMigrations } from "./migrations.ts";
import { createDatabasePool } from "./pool.ts";

const pool = createDatabasePool(readRuntimeConfig().database);

test("all versioned migrations are applied and core tables exist", async () => {
  const result = await runMigrations(pool);
  assert.deepEqual([...result.applied, ...result.existing].sort(), [
    "0001_platform.sql",
    "0002_projects_work.sql",
    "0003_claims_requests_files.sql",
  ]);

  const tables = await pool.query<{ table_name: string }>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `);
  const names = new Set(tables.rows.map((row) => row.table_name));
  for (const name of ["accounts", "projects", "activities", "claims", "requests", "files", "audit_records", "outbox_events"]) {
    assert.equal(names.has(name), true, `missing table ${name}`);
  }
});

test("database constraints reject uncontracted roles", async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO departments (department_id, name) VALUES ($1, $2)", ["dept-test", "Test"]);
    await assert.rejects(
      client.query(
        `INSERT INTO accounts
          (account_sub, employee_code, username, display_name, department_id, role)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ["sub-test", "EMP-TEST", "test-user", "Test User", "dept-test", "MANAGER"],
      ),
      /accounts_role_check/,
    );
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
});

test.after(async () => {
  await pool.end();
});
