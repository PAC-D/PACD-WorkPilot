# Binding instructions for coding agents

Read this file in full at the start of every implementation task. Also read all relevant docs linked from `README.md`. The purpose is to prohibit unplanned architectural drift, **not** to assume that docs are infallible.

## Authority and change management
1. Product requirements in `docs/PRD.md` define desired behavior.
2. `docs/SECURITY_RBAC.md` and `docs/DATA_MODEL.md` define data invariants and access boundaries.
3. `docs/API_CONTRACT.md` and `docs/REALTIME_CACHE.md` define transport, cache and synchronization behavior.
4. `docs/ARCHITECTURE.md` and `docs/UI_DESIGN_SYSTEM.md` define the approved technologies and UI.
5. Approved ADRs override prior decisions **only where explicitly stated**. Contradictions must be reported, not silently interpreted.

## Non-negotiable guardrails
- Do not add dependencies or hosted services outside the approved stack without an ADR. Especially: no Redis, custom WebSocket server, periodic admin polling, Next.js, Supabase platform, Firebase, Prisma or custom password database. ADR-0004 approves portable PostgreSQL; the hosted PostgreSQL provider still requires a deployment ADR.
- Never invent unlisted permissions, role capabilities, claim states, request states, endpoints, database keys, colors or new dashboard widgets. Propose changes separately.
- Never create an account with a hardcoded default password, log passwords, return password hashes, or expose hosted identity-provider admin credentials to browsers.
- No direct browser calls to PostgreSQL or any hosted data API. Authorization happens server-side on **each** object and query. UI visibility is not authorization.
- Never publish raw PII, request descriptions, receipt URLs or amounts to shared events. Events contain only `{type,entityId,scope,version,occurredAt}`.
- No scheduled refetch interval or `setInterval` fetching. Always use mutation invalidation, an authorized event adapter and reconnect/focus reconciliation. Note events may be missed; never treat them as guaranteed delivery.
- No optimistic approval state that implies financial approval before server confirmation. Optimistic work text editing only when explicitly approved and rolled back on error.
- Use shared `DataTable`, pagination, `MonthPicker`, file uploader, form renderer, chart components and design tokens. No module-specific copies.
- Do not create arbitrary user-defined executable forms; only JSON-schema-like allowlisted field definitions and server Zod validation.
- Every PostgreSQL query has a declared access pattern and matching index where needed. Use parameterized SQL, bounded keyset pagination and no unbounded fetching or N+1 query fan-out.
- Enforce billing month and project date rules; UTC for timestamps, explicit organization timezone for rendering.
- Use meaningful tests and update related docs in every change. `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` must eventually pass.

## Agent task protocol
1. State affected files/modules, existing contract(s), and whether an ADR is required.
2. Implement only requested capability; prefer existing abstractions.
3. Add authorization tests including own/others, scoped/unscoped, and self-approval cases.
4. Add idempotency, pagination, cache invalidation, audit, and event tests where relevant.
5. Document assumptions and unresolved questions in `docs/OPEN_DECISIONS.md` rather than inventing answers.
6. Report changed contracts and migrations at the end of task.

## Code conventions
- Strict TypeScript, no `any` without documented exception.
- API contracts validated with shared Zod schemas. Explicit domain errors, standardized error envelope.
- Keep HTTP handlers thin. Service functions own business rules; repository functions own PostgreSQL access patterns and transactions.
- Each domain module owns its data keys and policies; shared audit/events infrastructure only.
- Named exports, small focused components, accessible labels, minimal dependencies, formatting via shared lint configuration.
- No interactive secrets in repository; use AWS/CI secret configuration. `.env.example` must contain placeholders only.
