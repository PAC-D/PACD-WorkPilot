import type { PoolConfig } from "pg";

export interface RuntimeConfig {
  cursorSecret: string;
  database: PoolConfig;
  localAuthEnabled: boolean;
  nodeEnvironment: "development" | "test" | "production";
  port: number;
  webOrigin: string;
}

function required(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function port(environment: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = environment[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65_535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }
  return value;
}

export function readRuntimeConfig(environment: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const nodeEnvironmentRaw = environment.NODE_ENV?.trim() || "development";
  if (!(["development", "test", "production"] as const).includes(nodeEnvironmentRaw as "development")) {
    throw new Error("NODE_ENV must be development, test, or production");
  }
  const nodeEnvironment = nodeEnvironmentRaw as RuntimeConfig["nodeEnvironment"];
  const localAuthEnabled = environment.LOCAL_AUTH_ENABLED?.trim().toLowerCase() === "true";
  if (localAuthEnabled && nodeEnvironment === "production") {
    throw new Error("LOCAL_AUTH_ENABLED cannot be used in production");
  }
  const cursorSecret = environment.CURSOR_SECRET?.trim();
  if (!cursorSecret && nodeEnvironment === "production") throw new Error("CURSOR_SECRET is required in production");

  const connectionString = environment.DATABASE_URL?.trim();
  const database: PoolConfig = connectionString
    ? { connectionString }
    : {
        database: environment.POSTGRES_DB?.trim() || "workpilot",
        host: environment.POSTGRES_HOST?.trim() || "127.0.0.1",
        password: required(environment, "POSTGRES_PASSWORD"),
        port: port(environment, "POSTGRES_PORT", 5432),
        user: environment.POSTGRES_USER?.trim() || "workpilot",
      };

  return {
    cursorSecret: cursorSecret || `local-${crypto.randomUUID()}`,
    database: {
      ...database,
      allowExitOnIdle: false,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 10_000,
      max: 5,
    },
    localAuthEnabled,
    nodeEnvironment,
    port: port(environment, "API_PORT", 3000),
    webOrigin: environment.WEB_ORIGIN?.trim() || "http://127.0.0.1:5173",
  };
}
