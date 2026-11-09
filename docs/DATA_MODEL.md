# DynamoDB logical data model and access patterns

**Important:** DynamoDB is not a relational database. Tables below specify bounded query access patterns. No direct browser reads, no request-path Scan, no unbounded filtering or SQL-style offset. Document new GSI needs before coding them.

## Tables (v1: small bounded set)
Use separate tables to keep reasoning simple; `PK` partition key, `SK` sort key, and explicitly defined GSIs. Physical index names may be configured with env prefixes. Use ULID/UUIDv7-like sortable IDs when helpful, but no reliance on sequential IDs for security.

| Table | Primary key | GSIs / key patterns | Purpose |
|---|---|---|---|
| `Accounts` | `sub` | `UsernameIndex(username)`, `DepartmentIndex(departmentId,sub)` | Profile, status, permissionVersion, role grants, scopes |
| `Projects` | `projectId` | `StatusStartIndex(status,startDate)`, `OwnerIndex(ownerSub,projectId)` | Dates, status, owner, visibility |
| `ProjectMembers` | `PK=projectId`, `SK=userSub` | `UserProjectsIndex(userSub,projectId)` | Assignment/assignedAt/removedAt/history pointer |
| `Activities` | `activityId` | `UserDateIndex(userSub,createdAt#activityId)`, `ProjectDateIndex(projectId,createdAt#activityId)`, `ScopeDateIndex(scopeKey,createdAt#activityId)` | Work activity state/category/version |
| `ActivityUpdates` | `PK=activityId`, `SK=createdAt#updateId` | none | Append-only descriptions and status transitions |
| `Claims` | `claimId` | `UserPeriodIndex(userSub,periodMonth#claimId)`, `ScopeStatusIndex(scopeStatusKey,submittedAt#claimId)`, `PeriodTypeIndex(periodTypeKey,submittedAt#claimId)` | Claim type, amountMinor, currency, periodMonth, state, version |
| `Requests` | `requestId` | `UserDateIndex(requesterSub,createdAt#requestId)`, `ScopeStatusIndex(scopeStatusKey,createdAt#requestId)`, `TypeDateIndex(typeKey,createdAt#requestId)` | Validated payload, status, reviewer, version |
| `SystemRecords` | `PK`, `SK` | `EventStatusIndex(eventStatus,createdAt#eventId)` optional | Departments, categories, policies, role templates, approval history, audit, notifications, events, idempotency, summaries, attachment metadata |

`scopeStatusKey` is a **denormalized projection** for a specific department/project scope + status; for records with multiple authorized scopes create projection items in `SystemRecords` or a dedicated index table, and clean them on scope changes. Do not concatenate multiple scope IDs into one key and hope query filters work. GSI keys must be materialized and maintained atomically where possible.

## Example key families in SystemRecords
`CONFIG#DEPARTMENT` / `id`; `CONFIG#CATEGORY` / `id`; `CONFIG#CLAIM_TYPE` / `id`; `CONFIG#REQUEST_TYPE` / `id`; `CONFIG#PERMISSIONS` / `version`; `AUDIT#resourceType#resourceId` / `timestamp#eventId`; `EVENT#eventId` / `META`; `IDEMPOTENCY#actorSub` / `key`; `FILE#fileId` / `META`; `SUMMARY#scopeKey#YYYY-MM-DD` / `metric`; `PROJECT_ASSIGNMENT#projectId` / `timestamp#userSub`.

## Representative records
### Claim
```json
{
 "claimId":"clm_01...","userSub":"cognito-sub","departmentId":"dept_ops",
 "type":"MOBILE_BILL","periodMonth":"2026-10","amountMinor":125000,"currency":"BDT",
 "status":"SUBMITTED","submittedAt":"2026-11-09T03:00:00Z",
 "attachmentIds":["file_01..."],"version":3,"createdAt":"...","updatedAt":"..."
}
```
### Project
```json
{
 "projectId":"prj_01...","code":"PKNP","name":"PicknPack","ownerSub":"...",
 "startDate":"2026-11-01","plannedEndDate":"2027-02-28","actualEndDate":null,
 "status":"ACTIVE","createdAt":"...","updatedAt":"...","version":1
}
```

## Mandatory access patterns
| Query | Key/index path | Limits |
|---|---|---|
| My claims for month | `Claims.UserPeriodIndex` userSub + `begins_with(periodMonth#)` | 20, cursor |
| Admin pending claims in one permitted department | `Claims.ScopeStatusIndex` `dept#id#SUBMITTED` | 20, cursor |
| My activities latest | `Activities.UserDateIndex` | 20, cursor |
| Project activity latest | `Activities.ProjectDateIndex` | 20, cursor and project authorization |
| Employee project list | `ProjectMembers.UserProjectsIndex` + bounded BatchGet Projects | 20, cursor |
| All active projects | `Projects.StatusStartIndex` | 20, cursor |
| Requests by assigned review scope/status | `Requests.ScopeStatusIndex` | 20, cursor |
| Audit for one entity | `SystemRecords` `AUDIT#type#id` | 20, cursor |
| Chart 30-day trend | `SUMMARY#scopeKey#date` items via bounded BatchGet / bounded query | at most 30 buckets |
| Project milestones | `Projects.StatusStartIndex` by known statuses + bounded merge | 20, cursor per status / explicit combined endpoint |

Multi-scope Admin reports either issue bounded queries per permitted scope (max configured at 30 users), then stable merge, or read precomputed org/department summaries; never leak global counts to scoped users. For arbitrary keyword search in v1, search a **bounded indexed candidate set** (no fuzzy global scan), with explicit UX limits. User directory can use paginated department keys; global <=30 browse may use bounded admin-only fetch, but still max 100 and no arbitrary Scan in request path.

## Data correctness
- DynamoDB transaction condition and version attribute enforce optimistic concurrency. Return HTTP 409 if stale version.
- Strong reads where required after create/update if base table supports them; GSIs are eventually consistent. Client receives saved entity from mutation response; later queries reconcile.
- Idempotency keyed by actor + route + client key, with request hash and TTL; conflicting reuse rejected.
- `periodMonth` `YYYY-MM`, date-only `YYYY-MM-DD`, timestamps ISO UTC. BDT stored integer minor units, never binary floating point.
- Records have `createdAt`, `updatedAt`, `createdBy`, `version`; no hard deletion of approved transactions. Use status/archivedAt.
- Keep file content in S3; only `fileId`, object key, owner, security state, type and size in metadata. Authorized download presigns generated on demand. V1 accepts PDF, DOCX, JPG and PNG up to 5 MB (5,000,000 bytes) per file; extension, declared MIME, detected type and size must agree during finalization.
- Claim duplicate rules must be enforced with dedicated transactionally written uniqueness marker, e.g. `UNIQUE_CLAIM#user#type#period`, and released only under defined cancellation/rejection policy; travel exempt.
- Events stream may deliver duplicates/out of order: dedupe by event ID and compare versions; never apply event payload as entity state.

## Retention and recovery
Specify policy per record category before production. DynamoDB PITR, backup and restore tested; audit retention decided by business/legal owner. Never set TTL on approved financial records by default.
