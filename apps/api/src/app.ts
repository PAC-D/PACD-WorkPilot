import {
  createActivityInputSchema,
  assignProjectMemberInputSchema,
  claimTransitionInputSchema,
  createClaimInputSchema,
  createLocalAccountInputSchema,
  createProjectInputSchema,
  createRequestInputSchema,
  requestTransitionInputSchema,
  upsertDepartmentInputSchema,
  versionInputSchema,
  type Principal,
} from "@pacd/contracts";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";

import { CursorError } from "./common/cursor.ts";
import { DomainError, type PlatformService } from "./modules/platform-service.ts";

export interface ApiDependencies {
  authenticate: (request: Request) => Promise<Principal | null>;
  listLocalIdentities?: () => Promise<ReadonlyArray<{
    displayName: string;
    employeeCode: string;
    id: string;
    role: Principal["role"];
    username: string;
  }>>;
  platform?: PlatformService;
  webOrigin: string;
}

export function createApi(dependencies: ApiDependencies) {
  const app = new Hono();

  app.use("*", requestId());
  app.use(
    "/api/*",
    cors({
      allowHeaders: ["Content-Type", "Idempotency-Key", "If-Match", "X-WorkPilot-Local-User"],
      allowMethods: ["GET", "POST", "PATCH", "PUT", "OPTIONS"],
      credentials: false,
      origin: dependencies.webOrigin,
    }),
  );

  app.get("/api/v1/me", async (context) => {
    const principal = await dependencies.authenticate(context.req.raw);
    if (!principal) {
      return context.json(
        {
          error: {
            code: "UNAUTHENTICATED" as const,
            message: "Authentication required",
            requestId: context.get("requestId"),
          },
        },
        401,
      );
    }

    return context.json({ data: principal });
  });

  if (dependencies.listLocalIdentities) {
    app.get("/api/v1/development/identities", async (context) =>
      context.json({ data: await dependencies.listLocalIdentities?.() }),
    );
  }

  if (dependencies.platform) {
    const platform = dependencies.platform;
    const authenticate = (request: Request) => dependencies.authenticate(request);
    const limit = (value: string | undefined) => Math.min(100, Math.max(1, Number.parseInt(value ?? "20", 10) || 20));
    const invalid = (context: Context, details: unknown) => context.json({ error: { code: "VALIDATION_ERROR" as const, message: "Check the submitted fields", requestId: context.get("requestId"), details } }, 400);

    app.get("/api/v1/config", async (context) => {
      const actor = await authenticate(context.req.raw); if (!actor) return unauthenticated(context);
      return context.json({ data: { departments: await platform.listDepartments() } });
    });
    app.put("/api/v1/config/departments/:id", async (context) => {
      const actor = await authenticate(context.req.raw); if (!actor) return unauthenticated(context);
      const parsed = upsertDepartmentInputSchema.safeParse(await context.req.json()); if (!parsed.success) return invalid(context, parsed.error.flatten());
      return context.json({ data: await platform.upsertDepartment(actor, context.req.param("id"), parsed.data, context.req.header("Idempotency-Key") ?? "", context.get("requestId")) });
    });
    app.get("/api/v1/users", async (context) => {
      const actor = await authenticate(context.req.raw); if (!actor) return unauthenticated(context);
      return context.json(await platform.listAccounts(actor, limit(context.req.query("limit")), context.req.query("cursor")));
    });
    app.post("/api/v1/users", async (context) => {
      const actor = await authenticate(context.req.raw); if (!actor) return unauthenticated(context);
      const parsed = createLocalAccountInputSchema.safeParse(await context.req.json()); if (!parsed.success) return invalid(context, parsed.error.flatten());
      return context.json({ data: await platform.createLocalAccount(actor, parsed.data, context.req.header("Idempotency-Key") ?? "", context.get("requestId")) }, 201);
    });
    app.get("/api/v1/projects", async (context) => {
      const actor = await authenticate(context.req.raw); if (!actor) return unauthenticated(context);
      return context.json(await platform.listProjects(actor, limit(context.req.query("limit")), context.req.query("cursor")));
    });
    app.post("/api/v1/projects", async (context) => {
      const actor = await authenticate(context.req.raw); if (!actor) return unauthenticated(context);
      const parsed = createProjectInputSchema.safeParse(await context.req.json()); if (!parsed.success) return invalid(context, parsed.error.flatten());
      return context.json({ data: await platform.createProject(actor, parsed.data, context.req.header("Idempotency-Key") ?? "", context.get("requestId")) }, 201);
    });
    app.post("/api/v1/projects/:id/members", async (context) => {
      const actor=await authenticate(context.req.raw);if(!actor)return unauthenticated(context);const parsed=assignProjectMemberInputSchema.safeParse(await context.req.json());if(!parsed.success)return invalid(context,parsed.error.flatten());return context.json({data:await platform.assignProjectMember(actor,context.req.param("id"),parsed.data,context.req.header("Idempotency-Key")??"",context.get("requestId"))},201);
    });
    app.get("/api/v1/activities", async (context) => {
      const actor = await authenticate(context.req.raw); if (!actor) return unauthenticated(context);
      return context.json(await platform.listActivities(actor, limit(context.req.query("limit")), context.req.query("cursor")));
    });
    app.post("/api/v1/activities", async (context) => {
      const actor = await authenticate(context.req.raw); if (!actor) return unauthenticated(context);
      const parsed = createActivityInputSchema.safeParse(await context.req.json()); if (!parsed.success) return invalid(context, parsed.error.flatten());
      return context.json({ data: await platform.createActivity(actor, parsed.data, context.req.header("Idempotency-Key") ?? "", context.get("requestId")) }, 201);
    });
    app.get("/api/v1/claims", async (context) => {
      const actor = await authenticate(context.req.raw); if (!actor) return unauthenticated(context);
      return context.json(await platform.listClaims(actor, limit(context.req.query("limit")), context.req.query("cursor")));
    });
    app.post("/api/v1/claims", async (context) => {
      const actor = await authenticate(context.req.raw); if (!actor) return unauthenticated(context);
      const parsed = createClaimInputSchema.safeParse(await context.req.json()); if (!parsed.success) return invalid(context, parsed.error.flatten());
      return context.json({ data: await platform.createClaim(actor, parsed.data, context.req.header("Idempotency-Key") ?? "", context.get("requestId")) }, 201);
    });
    app.post("/api/v1/claims/:id/submit",async(context)=>{const actor=await authenticate(context.req.raw);if(!actor)return unauthenticated(context);const parsed=versionInputSchema.safeParse(await context.req.json());if(!parsed.success)return invalid(context,parsed.error.flatten());return context.json({data:await platform.submitClaim(actor,context.req.param("id"),parsed.data.version,context.req.header("Idempotency-Key")??"",context.get("requestId"))});});
    app.post("/api/v1/claims/:id/review",async(context)=>{const actor=await authenticate(context.req.raw);if(!actor)return unauthenticated(context);const parsed=claimTransitionInputSchema.safeParse(await context.req.json());if(!parsed.success)return invalid(context,parsed.error.flatten());return context.json({data:await platform.reviewClaim(actor,context.req.param("id"),parsed.data,context.req.header("Idempotency-Key")??"",context.get("requestId"))});});
    app.get("/api/v1/requests", async (context) => {
      const actor = await authenticate(context.req.raw); if (!actor) return unauthenticated(context);
      return context.json(await platform.listRequests(actor, limit(context.req.query("limit")), context.req.query("cursor")));
    });
    app.post("/api/v1/requests", async (context) => {
      const actor = await authenticate(context.req.raw); if (!actor) return unauthenticated(context);
      const parsed = createRequestInputSchema.safeParse(await context.req.json()); if (!parsed.success) return invalid(context, parsed.error.flatten());
      return context.json({ data: await platform.createRequest(actor, parsed.data, context.req.header("Idempotency-Key") ?? "", context.get("requestId")) }, 201);
    });
    app.post("/api/v1/requests/:id/submit",async(context)=>{const actor=await authenticate(context.req.raw);if(!actor)return unauthenticated(context);const parsed=versionInputSchema.safeParse(await context.req.json());if(!parsed.success)return invalid(context,parsed.error.flatten());return context.json({data:await platform.submitRequest(actor,context.req.param("id"),parsed.data.version,context.req.header("Idempotency-Key")??"",context.get("requestId"))});});
    app.post("/api/v1/requests/:id/review",async(context)=>{const actor=await authenticate(context.req.raw);if(!actor)return unauthenticated(context);const parsed=requestTransitionInputSchema.safeParse(await context.req.json());if(!parsed.success)return invalid(context,parsed.error.flatten());return context.json({data:await platform.reviewRequest(actor,context.req.param("id"),parsed.data,context.req.header("Idempotency-Key")??"",context.get("requestId"))});});
    app.get("/api/v1/audit", async (context) => {
      const actor = await authenticate(context.req.raw); if (!actor) return unauthenticated(context);
      return context.json(await platform.listAudit(actor, limit(context.req.query("limit")), context.req.query("cursor")));
    });
    app.get("/api/v1/dashboard/summary", async (context) => {
      const actor = await authenticate(context.req.raw); if (!actor) return unauthenticated(context);
      return context.json({ data: await platform.dashboard(actor) });
    });
  }

  app.notFound((context) =>
    context.json(
      {
        error: {
          code: "NOT_FOUND" as const,
          message: "Resource not found",
          requestId: context.get("requestId"),
        },
      },
      404,
    ),
  );

  app.onError((error, context) => {
    if (error instanceof CursorError) return context.json({ error: { code: "INVALID_CURSOR", message: error.message, requestId: context.get("requestId") } }, 400);
    if (error instanceof DomainError) {
      const status = error.code === "FORBIDDEN" ? 403 : error.code === "NOT_FOUND" ? 404 : 409;
      return context.json({ error: { code: error.code, message: error.message, requestId: context.get("requestId") } }, status);
    }
    return context.json(
      {
        error: {
          code: "INTERNAL_ERROR" as const,
          message: "An unexpected error occurred",
          requestId: context.get("requestId"),
        },
      },
      500,
    );
  });

  return app;
}

function unauthenticated(context: Context) {
  return context.json({ error: { code: "UNAUTHENTICATED", message: "Authentication required", requestId: context.get("requestId") } }, 401);
}
