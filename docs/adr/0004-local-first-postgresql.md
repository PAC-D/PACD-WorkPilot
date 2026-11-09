# ADR-0004: Local-first portable PostgreSQL

**Status:** Accepted by product owner | **Date:** 2026-11-09

## Decision
Replace the DynamoDB data-store baseline with standard PostgreSQL 16 or newer. Development runs PostgreSQL locally through Docker Compose and the Hono API runs as a normal Node.js process. The API uses `node-postgres` behind repository interfaces and versioned SQL migrations. No ORM is introduced.

This ADR overrides the DynamoDB-specific portions of ADR-0001, `DATA_MODEL.md`, and the DynamoDB Streams event source in ADR-0002. The browser still never accesses the database directly. The API, authorization, validation, audit, idempotency, outbox, cache invalidation, and no-polling rules remain unchanged.

## Portability
Migrations use portable PostgreSQL features and avoid provider-specific SQL. A later approved deployment may use AWS-managed PostgreSQL or a PostgreSQL VPS. Infrastructure and credentials remain environment adapters; application services do not depend on a hosting provider.

For an AWS deployment, Aurora Serverless PostgreSQL with the RDS Data API remains an option, but it is not selected or provisioned by this ADR. A deployment ADR and cost approval are required first.

## Local identity and files
Local development may use explicit mock identity and file adapters with fictional data only. They must be impossible to enable accidentally in production. PACD WorkPilot never stores user passwords. Production identity remains Cognito-compatible until a later approved identity ADR says otherwise.

## Consequences
- Relational constraints and transactions simplify memberships, approval histories, reporting, idempotency, and audit writes.
- Lists still use bounded keyset pagination and opaque signed cursors, never unbounded queries or offset pagination.
- Post-commit events come from a transactional outbox. Local development can process the outbox in-process; hosted environments require an approved durable publisher adapter.
- Database connections use one bounded pool per Node.js process. Serverless deployment must use the selected managed connection or Data API strategy rather than opening unbounded connections.
- PostgreSQL backup, restore, migration rollback, and index-plan testing replace DynamoDB PITR and GSI verification.

## Rejected alternatives
Full Supabase platform adoption was rejected to avoid a second identity, storage, API, and realtime stack before moving to company infrastructure. Prisma was rejected to keep the stack small and preserve explicit SQL and transaction ownership. A custom password database remains prohibited.
