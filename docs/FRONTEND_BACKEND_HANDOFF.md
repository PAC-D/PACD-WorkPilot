# Frontend to backend integration handoff

**Status:** The local React frontend is connected to the Hono API and PostgreSQL. Local identity uses fictional profiles and no passwords. This document tracks remaining production and hosted-adapter work; it is not a new API contract.

## Implemented local boundary

- The browser loads the authoritative principal from `/api/v1/me` and derives navigation from returned permissions.
- PostgreSQL supplies users, departments, projects, memberships, activities, claims, requests, audit records and dashboard aggregates.
- Lists are bounded and use viewer/policy/resource-bound signed keyset cursors.
- Create and core submit/review writes include the entity, idempotency result, audit record and outbox event in one transaction.
- The local login screen selects active fictional profiles through an adapter that configuration rejects in production.
- Static dashboard fixtures, the role preview selector and module placeholder page have been removed.
- Passwords and private file bytes are never stored in PostgreSQL.

## Remaining work

| Concern | Local state | Required before production |
|---|---|---|
| Authentication | Fictional local identity selector | Cognito token verification, challenge support, recovery, credential rotation, revocation and production session policy |
| User provisioning | Local profile and default grants | Provider account provisioning and invitation lifecycle without returning credentials |
| Domain workflows | Create, list, assignment, submit and core approval paths | Detail/edit screens, remaining needs-info/reject/paid/fulfilled controls and complete transition matrix |
| Files | Metadata schema only | Private local adapter for development and approved hosted object adapter with validation and scanning policy |
| Live invalidation | Transactional outbox rows | Local publisher plus approved hosted event transport and channel authorization |
| Filtering | Core bounded lists | All contracted date, status, employee and project filters bound into signed cursor identity |
| Tests | Unit security and cursor tests | PostgreSQL integration, API E2E, browser E2E, concurrency, idempotency, event and outage suites |
| Operations | Local migrations and checks | Hosted backup/restore, retention, monitoring, cost review and deployment ADR |

## Verification required

1. Run migrations, seed and schema integration tests against PostgreSQL 16 or newer.
2. Test own/other, scoped/unscoped, read-only Admin and all-role self-approval denial at API level.
3. Test cursor tampering, mismatch and expiry plus idempotent retry and optimistic concurrency.
4. Confirm dashboard charts and accessible tables use the same authorized response.
5. Verify no periodic data requests occur during an idle browser session.
6. Verify the local identity route is absent and local identity headers are rejected in production configuration.

## Open product decisions

Do not silently resolve the remaining decisions in `docs/OPEN_DECISIONS.md`, including hosted provider, retention, malware handling, session duration, duplicate-marker release behavior, project join-request workflow and hosted event authorization.
