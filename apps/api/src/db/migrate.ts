import { readRuntimeConfig } from "../config.ts";
import { runMigrations } from "./migrations.ts";
import { createDatabasePool } from "./pool.ts";

const config = readRuntimeConfig();
const pool = createDatabasePool(config.database);

try {
  const result = await runMigrations(pool);
  console.log(JSON.stringify({ applied: result.applied, event: "database_migrations_complete", existing: result.existing }));
} finally {
  await pool.end();
}
