import { serve } from "@hono/node-server";

import { createApi } from "./app.ts";
import { authenticateLocalRequest, listLocalIdentities } from "./auth/local-auth.ts";
import { readRuntimeConfig } from "./config.ts";
import { checkDatabase, createDatabasePool } from "./db/pool.ts";

const config = readRuntimeConfig();
const pool = createDatabasePool(config.database);
await checkDatabase(pool);

const app = createApi({
  authenticate: config.localAuthEnabled
    ? (request) => authenticateLocalRequest(pool, request)
    : async () => null,
  listLocalIdentities: config.localAuthEnabled ? () => listLocalIdentities(pool) : undefined,
  webOrigin: config.webOrigin,
});
const server = serve({ fetch: app.fetch, hostname: "127.0.0.1", port: config.port });

console.log(JSON.stringify({ event: "api_started", host: "127.0.0.1", port: config.port }));

async function shutdown(signal: string) {
  console.log(JSON.stringify({ event: "api_stopping", signal }));
  server.close(async (error) => {
    await pool.end();
    if (error) {
      console.error(JSON.stringify({ event: "api_stop_failed", message: error.message }));
      process.exitCode = 1;
    }
  });
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
