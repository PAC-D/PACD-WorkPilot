# ADR-0002: Invalidation-based live dashboard

**Status:** Accepted baseline | **Date:** 2026-11-09

## Decision
No interval polling. Use authenticated AppSync Events as small post-commit entity-change hints. Maintain data in TanStack Query and refetch only active affected queries. Invalidate locally after successful mutation and remotely on scoped event; reconcile once after reconnect/focus.

## Security and reliability
Subscription channel authorization mandatory; never broadcast raw data. DynamoDB stream at-least-once handling and versioned event dedupe. No assumption of guaranteed delivery. Connection failure displays status and manual refresh; reconnect reconciliation corrects missed events.

## Consequences
AppSync cost includes connection-minutes. More setup than polling, but matches user's no-timed-fetch requirement.
