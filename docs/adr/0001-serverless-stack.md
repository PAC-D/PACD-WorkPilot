# ADR-0001: Cost-conscious AWS serverless stack

**Status:** Partially superseded by ADR-0004 for database and local runtime | **Date:** 2026-11-09

## Decision
React/Vite SPA via S3/CloudFront; Hono TypeScript API on Lambda behind API Gateway HTTP API; DynamoDB on-demand domain tables; Cognito invite-only; S3 documents; AppSync Events and DynamoDB Streams for invalidation.

ADR-0004 replaces DynamoDB with portable PostgreSQL and defers the hosted runtime/provider decision. The original AWS stack remains historical context, not authorization to deploy.

## Drivers
<=30 active accounts; minimal idle compute costs; no user-visible polling; granular per-admin permissions; easy maintainability; future AWS deployment.

## Tradeoffs
DynamoDB favors known access patterns, not arbitrary SQL joins and global reports. Scope-authorization and idempotent materialized summaries need care. Live connection-minutes and CloudFront storage still cost money. Lambda cold starts and eventual GSI consistency must be accounted for. Cost estimate needs final AWS region/usage.

## Rejected
Redis, relational database with ongoing instance charges, always-on app containers, cron polling, infrastructure complexity beyond need. If complex ad hoc reports become necessary, reevaluate with an ADR.
