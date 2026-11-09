import { Pool, type PoolConfig } from "pg";

export function createDatabasePool(config: PoolConfig): Pool {
  const pool = new Pool(config);
  pool.on("error", (error) => {
    console.error(JSON.stringify({ event: "database_idle_client_error", message: error.message }));
  });
  return pool;
}

export async function checkDatabase(pool: Pool): Promise<void> {
  await pool.query("SELECT 1");
}
