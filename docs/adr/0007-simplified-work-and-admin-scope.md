# ADR-0007: Simple work tracking and explicit Admin visibility

**Status:** Accepted from the product-owner request of 2026-11-24

## Decision

Employees may create projects for their own work. A project they create is owned by them and immediately usable for tasks; only Super Admin or an explicitly granted project manager may assign other members. Work categories become Super Admin-managed tags. Existing activity statuses remain `PLANNED`, `IN_PROGRESS`, `BLOCKED`, and `COMPLETED`; the UI labels the first two Upcoming and Ongoing. Tasks record start, planned end and actual completion dates and keep an append-only update history. The owner edits their tasks. Project owners edit their projects; Super Admin retains organization management.

Admin read access covers employees with the `USER` role and the Admin's own records. Another Admin's work, claims and requests require a Super Admin-managed explicit subject grant. Super Admin remains organization-wide. This overrides the prior organization-wide Admin read default in PRD and SECURITY_RBAC only for Admin-to-Admin visibility. An Admin's granted read scope never grants write or approval rights. Dashboard employee rows and pending queues use the same server-side visibility predicate as lists.

Existing claim file presigns remain the hosted private S3 path. Local development uses a private filesystem adapter behind the same authorization checks; file bytes are never served from a public directory.

The approved single-instance runtime uses PostgreSQL commit notifications as the connected-client event hint transport. The Hono API exposes an authenticated Server-Sent Events stream and authorizes each event against current database grants and object ownership before delivery. Browser queries invalidate targeted keys and reconcile after reconnect/focus. The transactional outbox remains the durable record; PostgreSQL notifications are best effort and are not a durable replay publisher. Multi-instance delivery needs a later ADR.

## Access patterns

Tags are a small bounded catalog ordered by name and keyed by tag ID. Activities use existing user/date and project/date indexes; activity updates use the existing history index. Project edits use the primary key and owner. Admin subject visibility uses a small explicit `admin_visibility` relation keyed by viewer and target. Dashboard groups authorized employee rows over a bounded account set (at most ten active accounts). Claims and requests retain keyset pagination.
