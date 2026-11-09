# PACD WorkPilot | Internal Work and Employee Operations

> **Status:** Frontend login and typed demo foundation in progress; backend contract and policy foundation started, AWS adapters not implemented.
> **Version:** 1.0.0 | **Updated:** 2026-11-09 | **Audience:** product owners, developers, coding agents and operations.

A small internal application for **at most 30 active employee accounts**. It supports work updates, project allocations, monthly expense claims, internal requests, and management reporting. Three user-facing roles: **USER, ADMIN, SUPER_ADMIN**. Role labels do not grant blanket privileges: effective access comes from explicit policy and scope.

## Start here
1. Read [AGENTS.md](AGENTS.md), [product requirements](docs/PRD.md), [architecture](docs/ARCHITECTURE.md), [security and RBAC](docs/SECURITY_RBAC.md) **before changing code**.
2. Consult [data model](docs/DATA_MODEL.md), [API contract](docs/API_CONTRACT.md), [realtime/cache rules](docs/REALTIME_CACHE.md), and [UI system](docs/UI_DESIGN_SYSTEM.md) for domain changes.
3. Consult [AWS deployment](docs/AWS_DEPLOYMENT_COST.md) before infrastructure work; [testing](docs/TESTING_ACCEPTANCE.md) before pull requests.
4. Record architectural deviations in `docs/adr/`; update documentation and tests in the same PR. Do not silently substitute libraries, databases, polling, or identity providers.
5. See [implementation plan](docs/IMPLEMENTATION_PLAN.md) for the order of work.

## Immutable baseline until an approved ADR changes it

| Concern | Selected approach |
|---|---|
| Frontend | React + TypeScript + Vite, SPA |
| UI | Tailwind CSS + shadcn/ui (Radix primitives), Lucide icons, Recharts |
| Data fetching | TanStack Query; typed fetch client; Zod validation |
| Forms | React Hook Form + Zod |
| Backend | Node.js TypeScript, Hono HTTP API, AWS Lambda |
| API entry | Amazon API Gateway HTTP API (not REST API product) |
| Database | DynamoDB, on-demand capacity; bounded domain tables, not SQL |
| Login | Amazon Cognito User Pool Lite; invite-only username/password |
| File storage | Private Amazon S3 + presigned PUT/GET, validated finalization |
| Live invalidation | AWS AppSync Events: event notification only, then targeted TanStack Query invalidation |
| Event publication | DynamoDB Streams -> Lambda publisher (after committed mutations) |
| Hosting | S3 + CloudFront for compiled SPA |
| IaC | AWS CDK (TypeScript), one environment stack per stage |
| Logging | CloudWatch structured JSON with correlation IDs and redacted PII |
| No now | Redis, RDS, Aurora, EC2, ECS, App Runner, Kubernetes, cron polling, SSR, Next.js, microservices, GraphQL business API |

**Deployment constraint:** AWS pay-for-usage does not mean literally zero baseline cost. CloudFront/S3 storage and traffic, logs, AppSync connection-minutes, and optional DNS/domain services can incur cost. Validate the region, prices, service quotas, and budget before deploying. DynamoDB and Lambda are usage based; no private VPC/NAT Gateway in v1.

## User journeys
- **User** selects assigned projects, logs or revises activity, uploads expenses by billing month, submits requests, and tracks status.
- **Admin** sees scoped work, requests and claims; reviews only if explicitly granted; can see project assigned/end dates and reporting charts.
- **Super Admin** invites/disables identities, assigns roles/scopes and approval policy, manages projects/categories/request types, and audits changes. Super Admin is not exempt from financial self-approval restrictions.

## Key acceptance rules
- No background interval polling for dashboards. Live notification -> invalidate affected queries -> refetch only active viewers. Reconnect and visibility recovery trigger a one-time reconciliation read.
- A restricted Admin receives neither unauthorized data in initial queries nor unauthorized event notifications.
- Admin role assignment, claims self-approval and claims self-editing are **independent permissions**; self-approval default **DENY**.
- Date-only project milestones use `YYYY-MM-DD`; timestamps UTC ISO 8601, displayed in configured organization timezone (`Asia/Dhaka` initially).
- Monthly claims use `period_month` = `YYYY-MM`, not submission month. Multiple travel claims allowed; duplicate bill policy configurable.
- Pagination is server-side with capped `limit` (default 20, max 100), stable sort and **opaque DynamoDB cursors**, not fabricated SQL offset.
- Audit all security-sensitive changes. Every write is authenticated, authorized, validated, idempotent when retried, and emits a post-commit invalidation event.

## Local development
Install the Node.js version pinned in `.node-version` and pnpm version declared in `package.json`. Run `pnpm install`, then `pnpm dev` for the local Vite frontend. Use `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before submitting changes.

The current frontend has a production-oriented login screen with an unconfigured authentication adapter. Development builds expose fictional typed dashboards through an explicit preview control and role selector for USER, ADMIN, and SUPER_ADMIN. It is not connected to Cognito, the HTTP API, DynamoDB, S3, or AppSync Events. See [frontend to backend handoff](docs/FRONTEND_BACKEND_HANDOFF.md) before replacing fixtures.

Shared color, typography, and motion tokens live in `packages/ui/src/tokens.css`. Repository branding is sourced from `assets/logo_left.png` and `assets/favicon.png`; Vite serves that directory directly in development and copies the assets into production builds.

## Repository design
```text
apps/web/                  React SPA and typed demo dashboards
apps/api/                  Hono Lambda entry and domain services (planned)
packages/contracts/        Zod schemas and typed API/event contracts
packages/ui/               Shared UI/design tokens/components
infra/                     CDK stacks, IAM, budgets (planned)
contracts/                 Versioned JSON schemas/examples
.docs or docs/             ADRs, PRD, security, data, deployment, tests
```

## Delivery criteria
Complete all acceptance tests, a threat-model review, accessibility checks, a cost review, backup/restore demonstration, and a Super Admin handover checklist before production. See `docs/TESTING_ACCEPTANCE.md`.

## External references (verify before deployment)
- Cognito admin-create-user: https://docs.aws.amazon.com/cognito/latest/developerguide/how-to-create-user-accounts.html
- AWS Cognito pricing: https://aws.amazon.com/cognito/pricing/
- AWS AppSync Events pricing: https://aws.amazon.com/appsync/pricing/
- API Gateway pricing: https://aws.amazon.com/api-gateway/pricing/
- DynamoDB pricing: https://aws.amazon.com/dynamodb/pricing/
- Lambda pricing: https://aws.amazon.com/lambda/pricing/
