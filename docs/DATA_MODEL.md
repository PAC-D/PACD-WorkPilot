# PostgreSQL logical data model and access patterns

ADR-0004 replaces the DynamoDB baseline with portable PostgreSQL 16 or newer. The browser never connects to PostgreSQL. Every query is executed through the Hono API after authentication, permission, scope and object-policy checks.

Versioned SQL migrations live in `apps/api/migrations/`. Applied migrations are immutable and checksum-verified. Never edit an applied migration; add the next numbered file.

## Core tables

| Domain | Tables | Purpose |
|---|---|---|
| Identity | `departments`, `accounts`, `account_grants` | Profiles, roles, permission versions and explicit scoped grants |
| Reliability | `idempotency_records`, `audit_records`, `outbox_events` | Retry safety, append-only audit and post-commit invalidation events |
| Projects | `projects`, `project_memberships` | Project milestones and assignment/removal history |
| Work | `activities`, `activity_updates` | Current activity state and append-only updates |
| Files | `files` | Metadata for local or hosted private objects; never file bytes in PostgreSQL |
| Claims | `claims`, `claim_files`, `claim_reviews` | Monthly claims, attachments and review history |
| Requests | `requests`, `request_reviews` | Fixed request types, allowlisted payload and review history |

Project join-request persistence and configuration tables are deferred until their exact workflow schemas are approved. Claim duplicate enforcement is also deferred until the uniqueness-marker release rule for rejected/cancelled claims is decided. These gaps remain in `OPEN_DECISIONS.md` rather than being guessed in SQL.

## Mandatory access patterns

| Query | Index/order | Limit |
|---|---|---|
| My claims by month | `claims(user_sub, period_month DESC, claim_id DESC)` | 20 default, 100 maximum |
| Admin claims by department/status | `claims(department_id, status, submitted_at DESC, claim_id DESC)` | 20 default, keyset cursor |
| My latest activities | `activities(user_sub, activity_date DESC, activity_id DESC)` | 20 default, keyset cursor |
| Project activities | `activities(project_id, activity_date DESC, activity_id DESC)` | 20 default, project authorization |
| Employee projects | `project_memberships(account_sub, assigned_at DESC, membership_id DESC)` joined to authorized projects | 20 default |
| Projects by status/start | `projects(status, start_date DESC, project_id DESC)` | 20 default |
| Requests by department/status | `requests(department_id, status, created_at DESC, request_id DESC)` | 20 default |
| Requests by assigned reviewer | `requests(assigned_reviewer_sub, status, created_at DESC, request_id DESC)` | 20 default |
| Audit for one resource | `audit_records(resource_type, resource_id, occurred_at DESC, audit_id DESC)` | 20 default |
| Pending outbox events | partial `outbox_events(occurred_at,event_id)` where unpublished | bounded worker batch |

Lists use stable keyset pagination. Opaque signed cursors bind the viewer, policy version, filters, sort tuple and expiry. SQL `OFFSET` is not used for request pagination. Every list query has a hard limit and matching index; arbitrary unbounded exports remain prohibited.

## Transaction rules

One transaction owns the entity mutation, audit record, idempotency result and outbox event. Services own business rules; repositories own parameterized SQL and transaction mechanics.

- `version` implements optimistic concurrency; stale updates return HTTP 409.
- Idempotency is keyed by actor, route and client key with a request hash and expiry.
- Audit rows are append-only; PostgreSQL rejects update or deletion.
- Outbox payloads contain only `{type,entityId,scope,version,occurredAt}` semantics, never sensitive entity data.
- Foreign keys protect ownership and membership relationships.
- Check constraints enforce the contracted roles, states, money/date shapes and upload limits.
- BDT uses integer minor units, never floating-point values.
- Date-only values use PostgreSQL `date`; timestamps use `timestamptz` and are emitted as UTC ISO 8601.

## Local and hosted storage

Local development stores only file metadata until the local file adapter is implemented. Hosted deployment will use private object storage. V1 accepts PDF, DOCX, JPG and PNG up to 5,000,000 bytes; extension, declared MIME, detected MIME and size must agree before finalization.

## Database connections

The local Node server owns one bounded `pg` pool with at most five connections. Transactions always use one checked-out client and release it in `finally`. A later serverless deployment must select and test its connection strategy through a deployment ADR; it must not create unbounded per-request database connections.

## Retention and recovery

Retention is not yet approved. Never delete approved financial records or audit history by default. Before production, document and test PostgreSQL backups, point-in-time recovery where available, migration rollback, and restore into a separate database before controlled cutover.
