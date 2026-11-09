import { readRuntimeConfig } from "../config.ts";
import { createDatabasePool } from "./pool.ts";

const config = readRuntimeConfig();
const pool = createDatabasePool(config.database);

try {
  const result = await pool.query<{ database_name: string; server_version: string }>(
    "SELECT current_database() AS database_name, current_setting('server_version') AS server_version",
  );
  console.log(JSON.stringify({ event: "database_ready", ...result.rows[0] }));
} finally {
  await pool.end();
}
