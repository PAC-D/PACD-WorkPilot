import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import type { Pool } from "pg";

const migrationsDirectory = fileURLToPath(new URL("../../migrations/", import.meta.url));
const migrationFilePattern = /^\d{4}_[a-z0-9_]+\.sql$/;

interface AppliedMigration {
  checksum: string;
  name: string;
}

export interface MigrationResult {
  applied: ReadonlyArray<string>;
  existing: ReadonlyArray<string>;
}

export async function runMigrations(pool: Pool): Promise<MigrationResult> {
  const client = await pool.connect();
  const applied: string[] = [];
  const existing: string[] = [];

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        checksum text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await client.query("SELECT pg_advisory_lock(hashtext($1))", ["pacd_workpilot_schema_migrations"]);

    const files = (await readdir(migrationsDirectory)).filter((file) => migrationFilePattern.test(file)).sort();
    const migrationRows = await client.query<AppliedMigration>("SELECT name, checksum FROM schema_migrations");
    const known = new Map(migrationRows.rows.map((row) => [row.name, row.checksum]));

    for (const file of files) {
      const sql = await readFile(new URL(`../../migrations/${file}`, import.meta.url), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const previousChecksum = known.get(file);

      if (previousChecksum !== undefined) {
        if (previousChecksum !== checksum) throw new Error(`Applied migration ${file} has been modified`);
        existing.push(file);
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)", [file, checksum]);
        await client.query("COMMIT");
        applied.push(file);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    return { applied, existing };
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext($1))", ["pacd_workpilot_schema_migrations"]).catch(() => undefined);
    client.release();
  }
}
