# PACD WorkPilot | Internal Work and Employee Operations

> **Status:** Local-first application with an approved single-instance Lightsail deployment profile. AWS resources are not provisioned by this repository.
> **Version:** 1.0.0 | **Updated:** 2026-11-21 | **Audience:** product owners, developers, coding agents and operations.

A small internal application for **at most 10 active employee accounts**. It supports work updates, project allocations, monthly expense claims, internal requests, and management reporting. Three user-facing roles: **USER, ADMIN, SUPER_ADMIN**. Role labels do not grant blanket privileges: effective access comes from explicit policy and scope.

## Start here
1. Read [AGENTS.md](AGENTS.md), [product requirements](docs/PRD.md), [architecture](docs/ARCHITECTURE.md), [security and RBAC](docs/SECURITY_RBAC.md) **before changing code**.
2. Consult [data model](docs/DATA_MODEL.md), [API contract](docs/API_CONTRACT.md), [realtime/cache rules](docs/REALTIME_CACHE.md), and [UI system](docs/UI_DESIGN_SYSTEM.md) for domain changes.
3. Consult the approved [Lightsail deployment runbook](docs/LIGHTSAIL_DEPLOYMENT.md) before infrastructure work; [testing](docs/TESTING_ACCEPTANCE.md) before pull requests. The [managed-AWS design](docs/AWS_DEPLOYMENT_COST.md) is historical/future context only.
4. Record architectural deviations in `docs/adr/`; update documentation and tests in the same PR. Do not silently substitute libraries, databases, polling, or identity providers.
5. See [implementation plan](docs/IMPLEMENTATION_PLAN.md) for the order of work.

## Immutable baseline until an approved ADR changes it

| Concern | Selected approach |
|---|---|
| Frontend | React + TypeScript + Vite, SPA |
| UI | Tailwind CSS + shadcn/ui (Radix primitives), Lucide icons, Recharts |
| Data fetching | TanStack Query; typed fetch client; Zod validation |
| Forms | React Hook Form + Zod |
| Backend | Node.js TypeScript, Hono HTTP API; Node container on the shared Lightsail instance in production |
| API entry | Local Hono server; existing host Nginx at `/workpilot/api/` in production |
| Database | Portable PostgreSQL 16+; Docker Compose locally and an isolated WorkPilot volume on Lightsail |
| Login | Development-only database-backed identity selector locally; Cognito adapter in hosted mode |
| File storage | Private S3 presigned upload/download adapter in hosted mode |
| Live invalidation | Authorized SSE over PostgreSQL commit notifications; targeted TanStack Query invalidation |
| Event publication | PostgreSQL transactional outbox -> hosted publisher adapter |
| Hosting | Amazon Lightsail Linux instance; Docker Compose; Nginx + Hono + PostgreSQL (ADR-0006) |
| IaC | Added only after hosting approval |
| Logging | Structured JSON with correlation IDs and redacted PII |
| No now | Redis, Supabase platform, Firebase, Prisma, cron polling, SSR, Next.js, microservices, GraphQL business API |

**Deployment constraint:** local development incurs no cloud cost. ADR-0006 approves the shared Mumbai Lightsail topology, the existing `registration.pac-d.com` TLS endpoint, `/workpilot/` path routing and manual credential handoff. Backup retention and restore evidence still require operational confirmation before launch.

## User journeys
- **User** can create a project for their own tasks, choose a Super Admin-managed tag, and edit task status, notes, and dates. Claims and requests accept private attachments.
- **Admin** sees employee summaries and pending claims/requests; another Admin's records require an explicit directional Super Admin grant (ADR-0007).
- **User** selects assigned projects, logs or revises activity, uploads expenses by billing month, submits requests, and tracks status.
- **Admin** has read visibility for employees and own records; another Admin's records require an explicit Super Admin grant. Reviews or management require separate grants.
- **Super Admin** invites/disables identities, assigns roles/scopes and approval policy, manages projects/categories/request types, and audits changes. Super Admin is not exempt from financial self-approval restrictions.

## Key acceptance rules
- No background interval polling for dashboards. Live notification -> invalidate affected queries -> refetch only active viewers. Reconnect and visibility recovery trigger a one-time reconciliation read.
- A restricted Admin receives neither unauthorized data in initial queries nor unauthorized event notifications.
- Admin role assignment, claims self-approval and claims self-editing are **independent permissions**; self-approval default **DENY**.
- Date-only project milestones use `YYYY-MM-DD`; timestamps UTC ISO 8601, displayed in configured organization timezone (`Asia/Dhaka` initially).
- Monthly claims use `period_month` = `YYYY-MM`, not submission month. Multiple travel claims allowed; duplicate bill policy configurable.
- Pagination is server-side with capped `limit` (default 20, max 100), stable sort and opaque signed keyset cursors, never SQL offset.
- Audit all security-sensitive changes. Every write is authenticated, authorized, validated, idempotent when retried, and emits a post-commit invalidation event.

## Local development
Install the Node.js version pinned in `.node-version`, pnpm from `package.json`, and Docker Desktop/Engine. The beginner walkthrough and troubleshooting are in [Local development](docs/LOCAL_DEVELOPMENT.md). The normal sequence is:

```bash
cp .env.example .env
# Replace POSTGRES_PASSWORD in .env with a random local-only password.
pnpm install
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm db:check
pnpm dev
```

Open `http://127.0.0.1:5173`. The API listens at `http://127.0.0.1:3000`. `pnpm db:seed` creates only the fictional `Local Super Admin` profile and stores no password. The local login screen selects an active fictional identity through the development adapter; this route is absent unless `LOCAL_AUTH_ENABLED=true`, and configuration rejects that setting in production. The Super Admin can create additional local profiles from **Users & Access**, after which they become selectable local identities. `pnpm dev` runs both processes; `pnpm dev:web` and `pnpm dev:api` run them separately. Stop PostgreSQL with `pnpm db:down`; the named Docker volume preserves local data.

Use `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, and `pnpm build` before submitting changes. Never commit `.env`; `.env.example` contains placeholders only.

The local frontend is connected to the Hono API and PostgreSQL for identity profiles, dashboard aggregates, users, departments, projects, assignments, work activities, claims, requests and audit records. Hosted mode uses Cognito with suppressed delivery and a Super Admin-supplied one-time password, API JWT verification and private S3 attachments. All business writes use the API; the browser never connects to PostgreSQL and never receives AWS credentials. The approved single-instance runtime now provides authorized live invalidation through PostgreSQL notifications and SSE; recovery and remaining advanced workflow screens remain follow-up work. See [frontend to backend handoff](docs/FRONTEND_BACKEND_HANDOFF.md) and the [Lightsail runbook](docs/LIGHTSAIL_DEPLOYMENT.md).

Authenticated browser navigation uses canonical internal SPA routes: `/dashboard`, `/work`, `/people`, `/projects`, `/claims`, `/requests`, `/admin`, `/settings`, `/admin/audit` and `/profile`. The production browser prefix is `/workpilot`, for example `/workpilot/dashboard`. Navigation visibility follows the effective principal, and direct inaccessible paths show an access-denied or not-found state. Hosted static delivery must rewrite unknown WorkPilot document requests to `index.html` so refreshing a deep link continues to work.

Shared color, typography, and motion tokens live in `packages/ui/src/tokens.css`. Repository branding is sourced from `assets/logo_left.png` and `assets/favicon.png`; Vite serves that directory directly in development and copies the assets into production builds.

## Repository design
```text
apps/web/                  React SPA connected to the local API
apps/api/                  Hono API, PostgreSQL migrations and domain services
packages/contracts/        Zod schemas and typed API/event contracts
packages/ui/               Shared UI/design tokens/components
compose.yaml               Local PostgreSQL
deploy/                    Lightsail container/runtime configuration
contracts/                 Versioned JSON schemas/examples
.docs or docs/             ADRs, PRD, security, data, deployment, tests
```

## Delivery criteria
Complete all acceptance tests, a threat-model review, accessibility checks, a cost review, backup/restore demonstration, and a Super Admin handover checklist before production. See `docs/TESTING_ACCEPTANCE.md`.

## Hosted-service references
- Cognito admin-create-user: https://docs.aws.amazon.com/cognito/latest/developerguide/how-to-create-user-accounts.html
- AWS Cognito pricing: https://aws.amazon.com/cognito/pricing/
- S3 pricing: https://aws.amazon.com/s3/pricing/
