import type { Principal } from "@pacd/contracts";
import { Hono } from "hono";
import { requestId } from "hono/request-id";

export interface ApiDependencies {
  authenticate: (request: Request) => Promise<Principal | null>;
}

export function createApi(dependencies: ApiDependencies) {
  const app = new Hono();

  app.use("*", requestId());

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

  app.onError((_error, context) =>
    context.json(
      {
        error: {
          code: "INTERNAL_ERROR" as const,
          message: "An unexpected error occurred",
          requestId: context.get("requestId"),
        },
      },
      500,
    ),
  );

  return app;
}
