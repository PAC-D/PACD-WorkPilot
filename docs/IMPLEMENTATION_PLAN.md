# Milestone-based implementation plan

## Phase 0: Locked design decisions
Review `OPEN_DECISIONS.md`; sign off security scopes, claim limits, project join review, retention and AWS region. Approve or revise ADRs. Map user stories to tests.

## Phase 1: Local repo and platform
pnpm workspace, strict TS, Vite React, Hono Node server, local PostgreSQL, versioned SQL migrations, contract package, UI token library, identity adapter, principal + RBAC middleware, repository abstraction, audit, transactional outbox, structured logs and CI. Hosted infrastructure follows only after deployment approval.

## Phase 2: Projects and work
Project catalog, assignment/request join, activity history, keyset cursor queries and indexes; reusable tables/filters; scoped dashboard basic counts; first local event invalidation pipeline.

## Phase 3: Claims and files
Monthly claims and policy table, private S3 presigns, anti-duplicate markers, claim reviewer flow, rejection reasons, comprehensive role tests.

## Phase 4: Requests and reporting
Six fixed request types, configurable safe fields, notifications, status transitions, Admin chart wrappers and project timeline with date fields, CSV export scoped.

## Phase 5: Production hardening
Access control penetration scenarios, live event channel audit, restore drills, cost calculator and budget, runbook, AWS staging UAT, migration/rollback and production signoff.

## Feature completion definition
Contract documented; server schema and permission checks; conditional/idempotent writes; indexed query and cursor; event invalidation; accessible shared UI; failure/loading/empty states; audit trail; tests and documentation updated.
