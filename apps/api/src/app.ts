import {
  createActivityInputSchema,
  assignProjectMemberInputSchema,
  claimTransitionInputSchema,
  createClaimInputSchema,
  createLocalAccountInputSchema,
  createHostedAccountInputSchema,
  createProjectInputSchema,
  updateProjectInputSchema,
  createRequestInputSchema,
  createWorkTagInputSchema,
  updateActivityInputSchema,
  adminVisibilityInputSchema,
  requestTransitionInputSchema,
  upsertDepartmentInputSchema,
  versionInputSchema,
  uploadIntentSchema,
  type Principal,
  type Account,
  type CreateLocalAccountInput,
  type CreateHostedAccountInput,
} from "@pacd/contracts";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";

import { CursorError } from "./common/cursor.ts";
import { DomainError, type PlatformService } from "./modules/platform-service.ts";
import type { FileService } from "./files/file-service.ts";
import type { LocalObjectStorage } from "./files/local-storage.ts";
import type { PostgresEventStream } from "./events/postgres-event-stream.ts";

export interface ApiDependencies {
  authenticate: (request: Request) => Promise<Principal | null>;
  files?: FileService;
  localFiles?: LocalObjectStorage;
  events?:PostgresEventStream;
  listLocalIdentities?: () => Promise<ReadonlyArray<{
    displayName: string;
    employeeCode: string;
    id: string;
    role: Principal["role"];
    username: string;
  }>>;
  platform?: PlatformService;
  createUser?: (actor:Principal,input:CreateHostedAccountInput,idempotencyKey:string,requestId:string)=>Promise<Account>;
  webOrigin: string;
}

export function createApi(dependencies: ApiDependencies) {
  const app = new Hono();

  app.use("*", requestId());
  app.use(
    "/api/*",
    cors({
      allowHeaders: ["Authorization", "Content-Type", "Idempotency-Key", "If-Match", "X-WorkPilot-Local-User"],
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
      return context.json({ data: { departments: await platform.listDepartments(), workTags: await platform.listWorkTags() } });
    });
    app.put("/api/v1/config/departments/:id", async (context) => {
      const actor = await authenticate(context.req.raw); if (!actor) return unauthenticated(context);
      const parsed = upsertDepartmentInputSchema.safeParse(await context.req.json()); if (!parsed.success) return invalid(context, parsed.error.flatten());
      return context.json({ data: await platform.upsertDepartment(actor, context.req.param("id"), parsed.data, context.req.header("Idempotency-Key") ?? "", context.get("requestId")) });
    });
    app.post("/api/v1/config/work-tags",async(context)=>{
      const actor=await authenticate(context.req.raw);if(!actor)return unauthenticated(context);
      const parsed=createWorkTagInputSchema.safeParse(await context.req.json());if(!parsed.success)return invalid(context,parsed.error.flatten());
      return context.json({data:await platform.createWorkTag(actor,parsed.data,context.req.header("Idempotency-Key")??"",context.get("requestId"))},201);
    });
    app.get("/api/v1/users", async (context) => {
      const actor = await authenticate(context.req.raw); if (!actor) return unauthenticated(context);
      return context.json(await platform.listAccounts(actor, limit(context.req.query("limit")), context.req.query("cursor")));
    });
    app.post("/api/v1/users", async (context) => {
      const actor = await authenticate(context.req.raw); if (!actor) return unauthenticated(context);
      const body: unknown = await context.req.json();
      if (dependencies.createUser) {
        const parsed = createHostedAccountInputSchema.safeParse(body); if (!parsed.success) return invalid(context, parsed.error.flatten());
        return context.json({ data: await dependencies.createUser(actor, parsed.data, context.req.header("Idempotency-Key") ?? "", context.get("requestId")) }, 201);
      }
      const parsed = createLocalAccountInputSchema.safeParse(body); if (!parsed.success) return invalid(context, parsed.error.flatten());
      return context.json({ data: await platform.createLocalAccount(actor, parsed.data, context.req.header("Idempotency-Key") ?? "", context.get("requestId")) }, 201);
    });
    app.get("/api/v1/users/:id/visibility",async(context)=>{const actor=await authenticate(context.req.raw);if(!actor)return unauthenticated(context);return context.json({data:await platform.listAdminVisibility(actor,context.req.param("id"))});});
    app.put("/api/v1/users/:id/visibility",async(context)=>{const actor=await authenticate(context.req.raw);if(!actor)return unauthenticated(context);const parsed=adminVisibilityInputSchema.safeParse(await context.req.json());if(!parsed.success)return invalid(context,parsed.error.flatten());return context.json({data:await platform.setAdminVisibility(actor,context.req.param("id"),parsed.data,context.req.header("Idempotency-Key")??"",context.get("requestId"))});});
    app.get("/api/v1/projects", async (context) => {
      const actor = await authenticate(context.req.raw); if (!actor) return unauthenticated(context);
      const search=context.req.query("search")??"";if(search.length>120)return invalid(context,{search:"Search is too long"});
      return context.json(await platform.listProjects(actor, limit(context.req.query("limit")), context.req.query("cursor"),search));
    });
    app.post("/api/v1/projects", async (context) => {
      const actor = await authenticate(context.req.raw); if (!actor) return unauthenticated(context);
      const parsed = createProjectInputSchema.safeParse(await context.req.json()); if (!parsed.success) return invalid(context, parsed.error.flatten());
      return context.json({ data: await platform.createProject(actor, parsed.data, context.req.header("Idempotency-Key") ?? "", context.get("requestId")) }, 201);
    });
    app.patch("/api/v1/projects/:id",async(context)=>{const actor=await authenticate(context.req.raw);if(!actor)return unauthenticated(context);const parsed=updateProjectInputSchema.safeParse(await context.req.json());if(!parsed.success)return invalid(context,parsed.error.flatten());return context.json({data:await platform.updateProject(actor,context.req.param("id"),parsed.data,context.req.header("Idempotency-Key")??"",context.get("requestId"))});});
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
    app.patch("/api/v1/activities/:id",async(context)=>{const actor=await authenticate(context.req.raw);if(!actor)return unauthenticated(context);const parsed=updateActivityInputSchema.safeParse(await context.req.json());if(!parsed.success)return invalid(context,parsed.error.flatten());return context.json({data:await platform.updateActivity(actor,context.req.param("id"),parsed.data,context.req.header("Idempotency-Key")??"",context.get("requestId"))});});
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

  if (dependencies.files) {
    const files=dependencies.files;
    app.post("/api/v1/files/presign-upload",async(context)=>{const actor=await dependencies.authenticate(context.req.raw);if(!actor)return unauthenticated(context);const parsed=uploadIntentSchema.safeParse(await context.req.json());if(!parsed.success)return context.json({error:{code:"VALIDATION_ERROR",message:"Check the submitted fields",requestId:context.get("requestId"),details:parsed.error.flatten()}},400);return context.json({data:await files.authorizeUpload(actor,parsed.data,context.req.header("Idempotency-Key")??"",context.get("requestId"))},201);});
    app.post("/api/v1/files/:id/finalize",async(context)=>{const actor=await dependencies.authenticate(context.req.raw);if(!actor)return unauthenticated(context);return context.json({data:await files.finalize(actor,context.req.param("id"),context.req.header("Idempotency-Key")??"",context.get("requestId"))});});
    app.get("/api/v1/files/:id/download",async(context)=>{const actor=await dependencies.authenticate(context.req.raw);if(!actor)return unauthenticated(context);return context.json({data:await files.authorizeDownload(actor,context.req.param("id"))});});
  }

  if(dependencies.events){
    const events=dependencies.events;
    app.get("/api/v1/events",async(context)=>{
      const actor=await dependencies.authenticate(context.req.raw);if(!actor)return unauthenticated(context);
      if(!events.isConnected())return context.json({error:{code:"SERVICE_UNAVAILABLE",message:"Live updates unavailable",requestId:context.get("requestId")}},503);
      let unsubscribe=()=>{};
      const encoder=new TextEncoder();
      const stream=new ReadableStream<Uint8Array>({
        start(controller){
          controller.enqueue(encoder.encode(": connected\n\n"));
          unsubscribe=events.subscribe(actor.id,event=>controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`)),()=>{try{controller.close();}catch{ /* already closed */ }});
          context.req.raw.signal.addEventListener("abort",()=>{unsubscribe();try{controller.close();}catch{ /* already closed */ }},{once:true});
        },
        cancel(){unsubscribe();},
      });
      return new Response(stream,{headers:{"Content-Type":"text/event-stream","Cache-Control":"no-store","X-Accel-Buffering":"no"}});
    });
  }

  if(dependencies.localFiles){
    const local=dependencies.localFiles;
    app.put("/api/v1/local-files/:ticket",async(context)=>{
      try{await local.put(context.req.param("ticket"),context.req.raw.body,context.req.header("Content-Type")??"");return context.body(null,204);}
      catch{return context.json({error:{code:"VALIDATION_ERROR",message:"Invalid or expired file upload",requestId:context.get("requestId")}},400);}
    });
    app.get("/api/v1/local-files/:ticket",async(context)=>{
      try{const file=await local.get(context.req.param("ticket"));return new Response(Buffer.from(file.bytes),{headers:{"Content-Type":file.mimeType,"Cache-Control":"private, no-store","Content-Disposition":"attachment"}});}
      catch{return context.json({error:{code:"NOT_FOUND",message:"File unavailable",requestId:context.get("requestId")}},404);}
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
