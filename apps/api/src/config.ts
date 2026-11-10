import type { PoolConfig } from "pg";

export interface RuntimeConfig {
  awsRegion: string | null;
  cognito: { clientId: string; userPoolId: string } | null;
  cursorSecret: string;
  database: PoolConfig;
  localAuthEnabled: boolean;
  nodeEnvironment: "development" | "test" | "production";
  port: number;
  s3Bucket: string | null;
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
  const awsRegion = environment.AWS_REGION?.trim() || null;
  const cognitoUserPoolId = environment.COGNITO_USER_POOL_ID?.trim();
  const cognitoClientId = environment.COGNITO_CLIENT_ID?.trim();
  const s3Bucket = environment.S3_UPLOAD_BUCKET?.trim() || null;
  if ((cognitoUserPoolId && !cognitoClientId) || (!cognitoUserPoolId && cognitoClientId)) {
    throw new Error("COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID must be configured together");
  }
  if (nodeEnvironment === "production" && (!awsRegion || !cognitoUserPoolId || !cognitoClientId || !s3Bucket)) {
    throw new Error("AWS_REGION, Cognito, and S3 configuration are required in production");
  }

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
    awsRegion,
    cognito: cognitoUserPoolId && cognitoClientId ? { clientId: cognitoClientId, userPoolId: cognitoUserPoolId } : null,
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
    s3Bucket,
    webOrigin: environment.WEB_ORIGIN?.trim() || "http://127.0.0.1:5173",
  };
}
