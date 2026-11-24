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
    "0004_simplified_work.sql",
  ]);

  const tables = await pool.query<{ table_name: string }>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `);
  const names = new Set(tables.rows.map((row) => row.table_name));
  for (const name of ["accounts", "projects", "activities", "claims", "requests", "files", "work_tags", "admin_visibility", "request_files", "audit_records", "outbox_events"]) {
    assert.equal(names.has(name), true, `missing table ${name}`);
  }
});

test("Admin sees employees and self, with explicit access required for another Admin", async()=>{
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await client.query("INSERT INTO departments (department_id,name) VALUES ('scope-test','Scope test') ON CONFLICT DO NOTHING");
    for(const [id,role] of [["scope-viewer","ADMIN"],["scope-other","ADMIN"],["scope-employee","USER"],["scope-super","SUPER_ADMIN"]]){
      await client.query("INSERT INTO accounts (account_sub,employee_code,username,display_name,department_id,role) VALUES ($1,$2,$3,$4,'scope-test',$5)",[id,id,id,id,role]);
    }
    const check=async(viewer:string,target:string)=>Boolean((await client.query<{allowed:boolean}>("SELECT can_view_account($1,$2) allowed",[viewer,target])).rows[0]?.allowed);
    assert.equal(await check("scope-viewer","scope-viewer"),true);
    assert.equal(await check("scope-viewer","scope-employee"),true);
    assert.equal(await check("scope-viewer","scope-other"),false);
    assert.equal(await check("scope-employee","scope-other"),false);
    assert.equal(await check("scope-super","scope-other"),true);
    const scoped=async(viewer:string,target:string)=>Boolean((await client.query<{allowed:boolean}>("SELECT can_access_account($1,$2,'work.read.scope') allowed",[viewer,target])).rows[0]?.allowed);
    assert.equal(await scoped("scope-viewer","scope-employee"),false);
    await client.query("INSERT INTO account_grants (grant_id,account_sub,permission,scope,scope_ids,created_by) VALUES ('scope-grant','scope-viewer','work.read.scope','ALL',ARRAY['ALL'],'scope-super')");
    assert.equal(await scoped("scope-viewer","scope-employee"),true);
    assert.equal(await scoped("scope-viewer","scope-other"),false);
    await client.query("INSERT INTO admin_visibility (viewer_sub,target_sub,granted_by) VALUES ('scope-viewer','scope-other','scope-super')");
    assert.equal(await check("scope-viewer","scope-other"),true);
    assert.equal(await scoped("scope-viewer","scope-other"),true);
    assert.equal(await check("scope-other","scope-viewer"),false);
  }finally{await client.query("ROLLBACK");client.release();}
});

test("outbox notification arrives after commit with only an invalidation hint",async()=>{
  const listener=await pool.connect();const eventId=`test-${crypto.randomUUID()}`;
  try{
    await listener.query("LISTEN workpilot_events");
    const notified=new Promise<string>((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error("notification timed out")),2000);
      listener.once("notification",message=>{clearTimeout(timer);resolve(message.payload??"");});
    });
    await pool.query("INSERT INTO outbox_events (event_id,event_type,entity_id,scope,entity_version) VALUES ($1,'CONFIG_CHANGED','test-tag','ALL',1)",[eventId]);
    const payload=JSON.parse(await notified) as Record<string,unknown>;
    assert.deepEqual(Object.keys(payload).sort(),["entityId","occurredAt","scope","type","version"]);
    assert.equal(payload.type,"CONFIG_CHANGED");
  }finally{await pool.query("DELETE FROM outbox_events WHERE event_id=$1",[eventId]);await listener.query("UNLISTEN workpilot_events");listener.release();}
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
