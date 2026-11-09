# Frontend to backend integration handoff

**Status:** Frontend foundation uses local typed fixtures. This document lists required replacements for backend development and is not a new API contract.

## Current frontend boundary

- `apps/web/src/data/demo-data.ts` is the only source of dashboard records and principals.
- The role selector is a development preview control. It does not authenticate or authorize a user.
- Dashboard refresh re-runs the local query only. No network API or AppSync connection exists yet.
- Module routes beyond Overview intentionally show a shared shell until their contracted workflows are implemented.
- Chart values, people, projects, claims, requests, activities, organization counts, dates, and policy versions are fictional demonstration data.

## Backend replacements

| Frontend concern | Current demo behavior | Required backend integration |
|---|---|---|
| Principal and navigation | Role selector loads a typed fixture | Load `/api/v1/me`; derive visible navigation from returned effective permissions and policy version; never trust browser-stored role |
| Authentication | No sign-in flow | Cognito invite-only PKCE/session flow, first-login password change, privileged MFA decision, sign-out cache clear |
| Dashboard summary | Local arrays | `/api/v1/dashboard/summary` with authorized aggregates, bounded date range, server validation, and shared query keys |
| Project timeline | Local table rows | `/api/v1/dashboard/projects`; server-side authorization and opaque cursor pagination |
| Work, claims, requests | Static rows | Contracted list/detail/mutation endpoints with Zod response validation and standardized error envelopes |
| Review controls | Permission-gated visual state | Object-level server authorization on every action; enforce scope, transition policy, version, idempotency, and self-approval denial |
| Pagination | Not active in dashboard fixture | Shared cursor pagination using `{limit,nextCursor,hasMore}`; never add offset or total pages |
| Filtering | Display-only summary | Whitelisted query parameters that map to documented indexes; reset cursor when filters change |
| Live updates | Static connected indicator | Authenticated AppSync Events; invalidate affected active TanStack Query keys; no record data in event payload |
| Reconciliation | Manual refresh only | One-time active-query reconciliation after reconnect or meaningful focus return; no interval polling |
| Files | No upload UI in this pass | Presign, direct private S3 upload, finalization, progress, validation, and authorized short-lived download |
| Mutations | No writes in this pass | `Idempotency-Key`, entity version or `If-Match`, definitive mutation response, targeted cache updates, audit, and post-commit events |
| Dates and money | Presentation fixtures | UTC timestamps, organization timezone rendering, `YYYY-MM-DD`, `YYYY-MM`, integer BDT minor units |
| Errors and loading | Not exercised by local data | Shared skeleton, empty, forbidden, conflict, validation, disconnected, and retry states without leaking resource existence |
| Module routing | In-memory page selection | Production SPA routing and direct-route authorization behavior within the approved React/Vite architecture |

## Verification required during backend work

1. Add own/other, scoped/unscoped, read-only Admin, and all-role self-approval denial tests.
2. Add cursor mismatch/expiry, idempotent retry, optimistic concurrency, audit, event invalidation, and missed-event recovery tests.
3. Confirm chart totals match accessible table alternatives for the same authorized response.
4. Trace an idle ten-minute browser session and verify there are no periodic data requests.
5. Remove the demo role control and fixtures from production builds before authentication UAT.

## Product decisions still open

Backend implementation must not silently settle the decisions in `docs/OPEN_DECISIONS.md`, including AWS region, claim caps, retention, upload limits, MFA tier, dashboard period, and dynamic AppSync scope authorization.

