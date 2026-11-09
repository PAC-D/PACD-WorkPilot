# Changelog

## 2026-11-09 - Local API connection feedback
- Fixed the local login screen remaining indefinitely on "Loading local identities" when the API is unavailable.
- Added an actionable API connection error and retry control without adding polling.
- Made API startup reporting wait for a successful port bind and handle port conflicts without an unhandled error.

## 2026-11-09 - Local database application integration
- Removed dashboard fixtures, preview-role controls and placeholder module screens from the frontend.
- Connected local sign-in, navigation, dashboard aggregates, users, departments, projects, assignments, work, claims, requests and audit views to the Hono/PostgreSQL API.
- Added shared Zod contracts, signed keyset cursors, bounded PostgreSQL queries and database-backed empty states.
- Added transactional create and core submit/review paths with idempotency records, append-only audit rows and outbox events.
- Changed the local seed to one fictional Super Admin profile and disabled the two legacy seed identities without deleting their historical records.
- Preserved the prohibition on hardcoded credentials and custom password storage; hosted password lifecycle remains an identity-adapter responsibility.
- Added local cursor-secret configuration and updated local-development documentation.

## 2026-11-09 - Local PostgreSQL runtime foundation
- Accepted ADR-0004, replacing the DynamoDB-specific baseline with portable PostgreSQL and keeping the hosted provider undecided.
- Added Docker Compose local PostgreSQL, placeholder-only environment configuration, versioned checksum-verified SQL migrations, and a bounded `pg` connection pool.
- Added platform, projects/work, and claims/requests/files relational schemas with foreign keys, check constraints, indexes, append-only audit enforcement, idempotency records, and a transactional outbox.
- Added a local Hono Node server plus database migration, readiness and integration-test commands.
- Added a development-only fictional identity adapter, idempotent seed command, browser CORS policy, and beginner local-run guide.
- Updated architecture, API pagination, testing, runbook, AWS candidate deployment, and frontend handoff documentation.
- No AWS, VPS, Supabase, or other hosted resource was created.

## 2026-11-09 - Login and backend policy foundation
- Added an original responsive PACD WorkPilot login screen with accessible username/password controls, restrained motion, reduced-motion support, and a development-only dashboard preview.
- Added an authentication adapter boundary without storing passwords or introducing a custom identity database.
- Added shared Zod contracts for sign-in validation, standard errors, cursor pagination, date ranges, billing months, and 5 MB PDF/DOCX/JPG/PNG upload intents.
- Added shared `DatePicker` and `MonthPicker` controls for reuse across modules.
- Added the initial Hono API boundary for `/api/v1/me` and authorization policy tests covering own/other, scoped/unscoped, explicit Admin grants, and self-approval denial.
- Recorded product-owner decisions for Admin read visibility, request management, claim defaults, upload policy, and deferred MFA in ADR-0003.
- No database migration or AWS resource was created.

## 2026-11-09 - Typography and brand polish
- Centralized the approved font family, type scale, weights, line heights, colors, and motion timing in `packages/ui/src/tokens.css`.
- Normalized dashboard headings, labels, metrics, controls, tables, and chart text to remove inconsistent sizing and unnecessary bold weight.
- Replaced the sidebar text wordmark with the supplied PACD logo and added the supplied favicon to browser metadata.
- Reduced horizontal dashboard gutters and removed the fixed content width so wide screens use space more efficiently.
- Added restrained CSS entrance, hover, and brand transitions with a reduced-motion fallback.
- Updated the UI design documentation and README; no API, permission, data, or infrastructure contract changed.

## 2026-11-09 - Frontend foundation with role dashboards
- Bootstrapped the pnpm workspace with strict TypeScript, React, Vite, Tailwind CSS, TanStack Query, Zod, Lucide, and Recharts.
- Added shared contract schemas for the three roles, the documented permission catalog, and existing workflow statuses.
- Added shared UI primitives and responsive USER, ADMIN, and SUPER_ADMIN dashboard previews with typed fictional data.
- Added permission-driven navigation, scoped Admin behavior, self-approval messaging, accessible chart tables, responsive navigation, and CSS-controlled paper texture using locked color tokens.
- Added role and permission tests, no-polling query defaults, and production build scripts.
- Documented every demo-data seam and required backend replacement in `docs/FRONTEND_BACKEND_HANDOFF.md`.
- No backend endpoint, permission, database model, event schema, migration, or AWS resource changed.

## 2026-11-09 - Documentation baseline v1.0
- Locked product modules and three-role permission model.
- Documented AWS cost-conscious event-driven stack and strict no-polling rule.
- Created UX tokens, data model, API contract, security policy, and testing criteria.
- No executable application code included.
