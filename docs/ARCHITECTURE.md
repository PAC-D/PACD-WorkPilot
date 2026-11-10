# Architecture and repository boundaries

## Runtime profiles
Local development: Browser -> Vite SPA -> Hono Node server -> local PostgreSQL. Identity, files and event delivery use explicit development adapters with fictional data only.

Hosted deployment remains provider-configurable: compiled SPA -> CDN/static storage; browser -> Hono HTTP API -> PostgreSQL/private object storage/approved identity provider. AWS staging uses `eu-north-1`, Cognito identity and private S3 files under ADR-0005. CloudFront/S3, API Gateway/Lambda and managed PostgreSQL remain infrastructure candidates; the final runtime and hosted PostgreSQL topology still require the deployment ADR required by ADR-0004.

The SPA owns canonical browser routes and uses the History API without a routing dependency. Static hosting must return `index.html` for application document routes while continuing to serve real assets and API requests normally. Route visibility is derived from the authenticated principal, but server authorization remains authoritative.

## Rationale
The entity count is small, but domain permissions and relationships are non-trivial. PostgreSQL constraints and transactions make memberships, approvals, audit, reporting and idempotency easier to reason about. Keep one Hono modular monolith with internal domain modules. A Node process is the local runtime; hosted adapters may use Lambda or a small VPS without changing services. No microservices.

## Monorepo (planned)
```text
apps/web/src/{app,pages,features,components,hooks,lib,styles}
apps/api/src/{handler,common,modules,adapters}
packages/contracts/src/{schemas,events,permissions}
packages/ui/src/{components,tokens}
infra/                       hosted infrastructure after deployment approval
```

## Module separation
- `identity`: provider adapter, profile persistence, disable/revoke, permission versioning.
- `projects`: membership, assignment, milestones.
- `work`: activity and append-only updates.
- `claims`: monthly policy, file references, approvals.
- `requests`: fixed request types, validated fields and transitions.
- `dashboard`: authorized bounded summary queries, presentational series.
- `audit`: append-only change logs; never public broadcasts.
- `files`: presign, metadata, finalization, authorized retrieval.
- `events`: transactional outbox, publisher adapter and client invalidation.

## Write path (critical)
1. The identity adapter authenticates the request; the API loads the authoritative principal and permission version from PostgreSQL.
2. Validate schema, permission, resource scope and transition; check version and idempotency key.
3. In one PostgreSQL transaction write the entity, audit record, idempotency result and outbox event.
4. The publisher adapter maps committed outbox events to authorized scope-specific notifications and publishes ID/version only. Do not emit full records or sensitive fields.
5. UI receives event and invalidates only matching query keys; active query fetches latest server-authorized data.
6. Reconnect and focus events reconcile active views once. No polling every N seconds.

## Dashboard aggregations
At 30 employees, bounded indexed aggregate queries over fixed date ranges are acceptable. Add materialized summary tables only after measurements justify them. Charts default to 30 days and cap at 12 months. Do not query all historical data for every view.

## Architectural rules
- Frontend never trusts role stored in local storage; server always authorizes.
- Cognito temporary-password authentication is represented as an opaque `NEW_PASSWORD_REQUIRED` challenge. The browser submits the replacement password only to the identity-provider adapter; PACD WorkPilot APIs and PostgreSQL never receive or store it.
- `updatedAt`, version and event sequence support cache reconciliation. Events are notifications, not primary state.
- Event delivery is best effort; browser visibility/reconnect manual refresh are fallback.
- Browser should fetch dashboard **once on open**, and when a relevant mutation/event/focus/reconnect occurs. No time-based refetch.
- Use explicit indexed joins and avoid N+1 query loops.
- Centralized error envelope, correlation ID and sensitive-data-safe logging.
- No free-form arbitrary report builder in v1.

## Alternatives explicitly rejected for v1
Full Supabase platform, Prisma, Next.js SSR, Redis, backend cron polling and microservices remain rejected. AWS-managed PostgreSQL versus a PostgreSQL VPS is a later deployment decision with cost and operations review.
