# Security, identity and authorization specification

## Identity
Production identity remains designed for an invite-only Cognito User Pool until deployment approval, with no self-signup. Local development uses an explicit mock adapter with fictional identities and never stores passwords. Username is an immutable employee login such as `emp-001`; `employeeCode` is a separate unique business ID. Provider subject (`sub`) is the binding identity primary key; PostgreSQL keeps the application profile and grants. Never generate or return reusable passwords in a list or store them in PostgreSQL, logs, frontend storage, seed files or application email. MFA is deferred for v1 by product-owner decision (ADR-0003); the identity boundary must allow it later without redesigning domain modules.

For hosted first login, Super Admin asks Cognito to provision an invite-only account and Cognito emails the temporary password. It expires after 7 days. A successful sign-in with that credential returns an opaque `NEW_PASSWORD_REQUIRED` challenge. The browser collects matching replacement-password fields and completes the challenge directly through the Cognito adapter. New passwords require at least 12 characters with uppercase, lowercase, number and special-character classes; Cognito remains authoritative. Challenge sessions and passwords must not enter application logs, PostgreSQL, analytics, URLs or shared browser storage.

## Role and permission evaluation
`effective = activeUser AND authenticated AND hasExplicitPermission AND inAuthorizedScope AND passesObjectPolicy AND transitionAllowed`.
Role templates provide defaults, but Super Admin grants and revokes per-user overrides. **Deny overrides allow**. Scopes: OWN, PROJECT_MEMBER, DEPARTMENT, ASSIGNED_REVIEWER, ALL. Grants have `{permission,scope,scopeIds?,enabled}`. No wildcard `*` grants through UI. Every privilege escalation invalidates old permission version and requires fresh authorization (token revocation where feasible).

## Permission catalog (v1)
`work.create.own`, `work.read.own`, `work.edit.own`, `work.read.scope`, `projects.read.assigned`, `projects.request_join`, `projects.manage`, `projects.assign`, `claims.create.own`, `claims.read.own`, `claims.edit.own`, `claims.read.scope`, `claims.edit.scope`, `claims.review.scope`, `claims.approve.scope`, `claims.mark_paid.scope`, `requests.create.own`, `requests.read.own`, `requests.read.scope`, `requests.review.scope`, `users.read.scope`, `users.manage`, `roles.manage`, `settings.manage`, `audit.read`, `dashboard.read.scope`, `reports.export.scope`.

## Role defaults
- USER: personal work/projects/claims/requests.
- ADMIN: `dashboard.read.scope`, `users.read.scope`, `work.read.scope`, `claims.read.scope`, `requests.read.scope` with organization-wide read scope in v1. Create/assign/configure/review/edit/approve/export rights are **not automatic**.
- SUPER_ADMIN: organization-wide management capabilities, except v1 prohibition on self-approval. Role changes only Super Admin, and bootstrap is out-of-band.

Request assignment and acceptance are Super Admin capabilities by default. An Admin requires an explicit Super Admin-managed grant and still passes object, transition and audit policies.

## Self-modification and self-approval
- An Admin may correct own DRAFT claim with `claims.edit.own`.
- Admin may edit others' submitted claims **only** with `claims.edit.scope`, correct scope, mandatory reason/audit, and policy-allowed state; no silent amount changes after approval.
- No role may approve their own claim. `claims.approve.scope` applies to **others only**. An administrator may not create a second account to evade policy; actor and beneficiary relationship must be reviewed operationally.
- Request self-approval is also denied for leave/purchase/API access, unless future explicitly approved policy states otherwise. Access provisioning can require segregation of duties.
- Super Admin sets grants per admin, chooses review scope and approval rights, cannot switch on a self-approval toggle in v1.

## API controls
Identity token verification plus API object-level authorization; use version-checked SQL writes, CSRF-safe auth when using cookies (or PKCE with secure token handling), strict CORS, security headers and hosted rate limits. Hosted object uploads use scoped presigned URLs only after authorization and validated completion. Local file adapters use fictional files and remain private to the development machine. Validate extensions, detected MIME and size; never expose a public upload directory. Audit sensitive events.

The SPA Cognito app client is public and has no client secret. The API accepts access tokens only after issuer, signature, client and token-use verification, then reloads the active PostgreSQL profile and grants. S3 upload authorization is limited to an actor-owned DRAFT/NEEDS_INFO claim; finalization compares exact byte length and MIME metadata and deletes a mismatched object. Scoped claim readers may request short-lived downloads, but S3 remains private.

## Audit requirements
Immutable append-only: `actorSub`, `action`, `resourceType`, `resourceId`, `oldState`, `newState`, `reason`, `timestamp`, `requestId`, `permissionPolicyVersion`. Redact passwords, secrets and PII from logs. PostgreSQL rejects audit update/delete operations, but this is not a WORM guarantee; hosted infrastructure also requires restricted credentials and backups.

## Threat scenarios
IDOR, permission scope leak through query or event channel, forged approval, duplicate claim replay, stale admin privilege after revoke, malicious file upload, overly broad S3 presign, stream duplicate event, audit editing, employee enumeration, excessive exports. Each needs negative tests.

## Operational safeguards
Hosted logs need retention; provider-level audit, PostgreSQL PITR/backups, private object versioning/lifecycle, encryption and budget alerts require deployment approval. Disable accounts and revoke sessions for departures. No secrets in git. Test database and file restore plus emergency access.
