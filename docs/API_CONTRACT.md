# HTTP API contract v1

Base URL `/api/v1`; UTF-8 JSON; provider-issued bearer identity in hosted environments; all hosted routes HTTPS; resource authorization always server-side. Local development uses an explicitly enabled fictional identity adapter and never accepts it in production. Typed Zod schemas in `packages/contracts`. Do not implement undocumented endpoints without contract update.

Hosted sign-in and `NEW_PASSWORD_REQUIRED` completion are identity-provider operations, not PACD WorkPilot business endpoints. Shared contracts model the outcomes so the UI can switch from sign-in to password replacement without exposing passwords or challenge sessions to this API.

Hosted `POST /users` provisions Cognito first, stores Cognito `sub` as `account_sub`, applies explicit default grants transactionally, and never returns a temporary password. Local mode creates only a fictional profile. `POST /files/presign-upload` requires `{claimId,fileName,mimeType,sizeBytes}` for an actor-owned editable claim and returns a five-minute object-specific PUT URL. Finalization verifies S3 metadata before marking the file usable. Download URLs are five-minute, object-specific and authorized on every request.

## Standard response conventions
- Successful list: `{data:[...], page:{limit:20,nextCursor:"opaque-or-null",hasMore:true}}`; `nextCursor` encodes a keyset sort tuple, query identity, expiry and signature. Never accept raw SQL or an unsigned cursor from the client. No `totalPages` or offset pagination.
- Single record: `{data:{...}}`.
- Error: `{error:{code:"FORBIDDEN",message:"Access denied",requestId:"...",details?:{}}}`. Do not leak existence of inaccessible resources.
- GET conditional requests may use `ETag`/If-None-Match where safe, but no server memory cache assumed.
- Writes use `Idempotency-Key` on create/approval/finalization and `If-Match` or payload `version` for updates.
- Limit default 20, max 100. Filters are whitelisted and converted to parameterized indexed SQL.

## Route registry
| Verb | Path | Behavior |
|---|---|---|
| GET | `/me` | Profile and effective permissions (no secrets) |
| GET | `/development/identities` | Local development only: fictional identity selector; route is absent when local auth is disabled |
| GET | `/users` | Scoped directory, cursor |
| POST | `/users` | Super Admin provisions hosted-provider login + profile |
| PATCH | `/users/:id` | Profile, status; admin changes separately guarded |
| PUT | `/users/:id/grants` | Super Admin grant update with policy version |
| POST | `/users/:id/reset-password` | Privileged hosted-provider reset; no plaintext response |
| GET/POST | `/projects` | List/create (POST requires permission) |
| GET/PATCH | `/projects/:id` | Details/edit with version |
| POST | `/projects/:id/members` | Assign membership, timestamps |
| POST | `/projects/:id/join-requests` | Request assignment |
| GET/POST | `/activities` | Scoped list/create |
| GET/PATCH | `/activities/:id` | Get/update current state |
| POST | `/activities/:id/updates` | Append activity update |
| GET/POST | `/claims` | Scoped list/create draft |
| GET/PATCH | `/claims/:id` | Details/allowed edits |
| POST | `/claims/:id/submit` | Submit claim |
| POST | `/claims/:id/review` | Approve/reject/needs-info/mark paid, permitted transitions |
| GET/POST | `/requests` | Scoped list/create |
| GET/PATCH | `/requests/:id` | Details/allowed edits |
| POST | `/requests/:id/submit` | Submit request |
| POST | `/requests/:id/review` | Review/approve/reject/fulfill |
| GET | `/dashboard/summary` | Scoped counts and chart series; range max 12 months |
| GET | `/dashboard/projects` | Timeline and milestone list |
| GET | `/config` | Public-to-authenticated allowed reference/config lists |
| PUT | `/config/:kind/:id` | Authorized configuration changes |
| POST | `/files/presign-upload` | Claim-owned signed upload intent with size/type limits |
| POST | `/files/:id/finalize` | HEAD-check authorized size/type and finalize metadata |
| GET | `/files/:id/download` | Authorize, return short-lived presigned URL |
| GET | `/audit` | Super Admin/scoped authorized audit queries |

## Query conventions
`?limit=20&cursor=<opaque>&status=...&projectId=...&from=2026-11-01&to=2026-11-30`. If filters/sort change, discard cursor. `cursor` signatures bind viewer, query parameters, expiry and policyVersion; return 400/410 on mismatch/expiry. All time ranges bounded.

When the development identity adapter is explicitly enabled, `POST /users` creates only a fictional local profile and default grants. It never accepts, generates, returns or stores a password. The profile becomes selectable from `/development/identities`. Hosted behavior must provision credentials through the approved identity provider while preserving the same application profile contract.

## Real-time contract
Not a business API: the selected authorized event adapter publishes `EntityChanged` `{eventId,type,entityId,scope,version,occurredAt}`; no records or secrets. Local development may use an in-process adapter; AppSync Events is only an AWS candidate. See `REALTIME_CACHE.md` and `contracts/event.schema.json`.

## Access examples
`POST /claims/:id/review` requires `claims.approve.scope`, correct scope, different claim owner, allowed status transition; checks after authenticated identity resolution. `PUT /users/:id/grants` only for Super Admin, never ordinary Admin.

## Response status
201 created, 200 success, 204 success/no content, 400 validation, 401 unauthenticated, 403 forbidden, 404 absent/inaccessible, 409 version/idempotency conflict, 413 upload too large, 429 throttled, 500 sanitized internal failure.
