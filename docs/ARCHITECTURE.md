# Architecture and repository boundaries

## Runtime deployment
Browser -> CloudFront -> private S3 SPA (OAC). Browser -> API Gateway HTTP API -> Hono Lambda -> DynamoDB/S3/Cognito. Browser subscribes to authorized AppSync Events for **invalidation hints only**. Mutation -> conditional DynamoDB write / TransactWrite -> DynamoDB Stream -> publisher Lambda -> AppSync Events. There is no Redis, scheduler, NAT, always-running app container or DB connection pool.

## Rationale
The entity count is small, but domain permissions and data relationships are non-trivial. DynamoDB requires explicit access-pattern design, with no SQL joins; this documentation commits to those patterns. Serverless services minimize idle compute, not cost to zero. Keep a single Hono Lambda with internal modules; extract functions only for streams or operational tasks. No microservices.

## Monorepo (planned)
```text
apps/web/src/{app,pages,features,components,hooks,lib,styles}
apps/api/src/{handler,common,modules,adapters}
packages/contracts/src/{schemas,events,permissions}
packages/ui/src/{components,tokens}
infra/lib/{frontend,api,auth,db,events,storage,observability}.ts
```

## Module separation
- `identity`: Cognito admin provisioning, profile persistence, disable/revoke, permission versioning.
- `projects`: membership, assignment, milestones.
- `work`: activity and append-only updates.
- `claims`: monthly policy, file references, approvals.
- `requests`: fixed request types, validated fields and transitions.
- `dashboard`: authorized bounded summary queries, presentational series.
- `audit`: append-only change logs; never public broadcasts.
- `files`: presign, metadata, finalization, authorized retrieval.
- `events`: stream handler, outbox-style event records, publisher and client invalidation.

## Write path (critical)
1. API Gateway JWT authorizer checks token; handler loads authoritative principal/permission version from DB when required.
2. Validate schema and resource scope; conditional version check / idempotency record.
3. Transactionally write entity, audit record, and `EVENT#...` outbox marker where within DynamoDB transaction limits. If side effects fail, retries and stream handling are idempotent.
4. Stream publisher maps event to allowed scope-specific channel(s) and publishes ID/version only. Do not emit full record or sensitive fields.
5. UI receives event and invalidates only matching query keys; active query fetches latest server-authorized data.
6. Reconnect and focus events reconcile active views once. No polling every N seconds.

## Dashboard aggregations
At 30 employees, small bounded queries for scoped dashboards are acceptable if fully indexed and limited by fixed date range. Daily summary items (`SUMMARY#YYYY-MM-DD#SCOPE`) can be maintained on writes to support trends. Define counter correctness in tests, include idempotent update and compensation logic; do not increment a counter from an at-least-once stream without dedupe. Charts default to 30 days and cap at 12 months. Do not query all historical data for every view.

## Architectural rules
- Frontend never trusts role stored in local storage; server always authorizes.
- `updatedAt`, version and event sequence support cache reconciliation. Events are notifications, not primary state.
- Event delivery is best effort; browser visibility/reconnect manual refresh are fallback.
- Browser should fetch dashboard **once on open**, and when a relevant mutation/event/focus/reconnect occurs. No time-based refetch.
- Avoid cross-item joins by bounded BatchGet after query; no N+1 loops.
- Centralized error envelope, correlation ID and sensitive-data-safe logging.
- No free-form arbitrary report builder in v1.

## Alternatives explicitly rejected for v1
PostgreSQL/RDS (idle costs), Aurora Serverless (complex cost/network and engine/version auto-pause considerations), Lambda-hosted Next.js SSR (extra infra), app containers, Redis, backend cron polling. Reconsider through measured need and ADR.
