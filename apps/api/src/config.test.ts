import assert from "node:assert/strict";
import test from "node:test";

import { readRuntimeConfig } from "./config.ts";

test("builds a bounded local PostgreSQL pool configuration", () => {
  const config = readRuntimeConfig({ POSTGRES_PASSWORD: "local-test-only" });

  assert.equal(config.database.host, "127.0.0.1");
  assert.equal(config.database.database, "workpilot");
  assert.equal(config.database.max, 5);
  assert.equal(config.localAuthEnabled, false);
  assert.equal(config.nodeEnvironment, "development");
  assert.equal(config.port, 3000);
});

test("allows local identity only outside production", () => {
  assert.equal(
    readRuntimeConfig({ LOCAL_AUTH_ENABLED: "true", POSTGRES_PASSWORD: "local-test-only" })
      .localAuthEnabled,
    true,
  );
  assert.throws(
    () =>
      readRuntimeConfig({
        LOCAL_AUTH_ENABLED: "true",
        NODE_ENV: "production",
        POSTGRES_PASSWORD: "local-test-only",
      }),
    /cannot be used in production/,
  );
});

test("requires complete Cognito configuration in production", () => {
  assert.throws(
    () => readRuntimeConfig({ DATABASE_URL: "postgresql://example.invalid/workpilot", NODE_ENV: "production", CURSOR_SECRET: "secret" }),
    /AWS_REGION, Cognito, and S3 configuration are required/,
  );
  const config = readRuntimeConfig({
    AWS_REGION: "eu-north-1",
    COGNITO_CLIENT_ID: "client-id",
    COGNITO_USER_POOL_ID: "eu-north-1_pool",
    CURSOR_SECRET: "secret",
    DATABASE_URL: "postgresql://example.invalid/workpilot",
    NODE_ENV: "production",
    S3_UPLOAD_BUCKET: "workpilot-test-files",
  });
  assert.deepEqual(config.cognito, { clientId: "client-id", userPoolId: "eu-north-1_pool" });
});

test("accepts a managed DATABASE_URL without requiring local password variables", () => {
  const config = readRuntimeConfig({ DATABASE_URL: "postgresql://example.invalid/workpilot" });
  assert.equal(config.database.connectionString, "postgresql://example.invalid/workpilot");
});

test("rejects missing local database credentials and invalid ports", () => {
  assert.throws(() => readRuntimeConfig({}), /POSTGRES_PASSWORD is required/);
  assert.throws(
    () => readRuntimeConfig({ API_PORT: "70000", POSTGRES_PASSWORD: "local-test-only" }),
    /API_PORT must be an integer/,
  );
});
