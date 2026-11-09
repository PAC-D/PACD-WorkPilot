# Security, identity and authorization specification

## Identity
Amazon Cognito User Pool (Lite to start), invite-only, no self-signup. Username = immutable employee login such as `emp-001`; `employeeCode` separate unique business ID. Cognito subject (`sub`) is binding identity primary key; application keeps profile and grants. Super Admin creates account via backend `AdminCreateUser`, temporary random password handled by Cognito, first login requires `NEW_PASSWORD_REQUIRED`. Never generate or return reusable passwords in a list, never store them in DynamoDB, logs, frontend storage, seed files or emails sent by the app. For first bootstrap, privileged operator executes audited one-time provisioning with least-privileged AWS access. Require MFA for privileged users if supported by selected Cognito plan; if the chosen tier cannot meet requirement, upgrade tier in an ADR before production.

## Role and permission evaluation
`effective = activeUser AND authenticated AND hasExplicitPermission AND inAuthorizedScope AND passesObjectPolicy AND transitionAllowed`.
Role templates provide defaults, but Super Admin grants and revokes per-user overrides. **Deny overrides allow**. Scopes: OWN, PROJECT_MEMBER, DEPARTMENT, ASSIGNED_REVIEWER, ALL. Grants have `{permission,scope,scopeIds?,enabled}`. No wildcard `*` grants through UI. Every privilege escalation invalidates old permission version and requires fresh authorization (token revocation where feasible).

## Permission catalog (v1)
`work.create.own`, `work.read.own`, `work.edit.own`, `work.read.scope`, `projects.read.assigned`, `projects.request_join`, `projects.manage`, `projects.assign`, `claims.create.own`, `claims.read.own`, `claims.edit.own`, `claims.read.scope`, `claims.edit.scope`, `claims.review.scope`, `claims.approve.scope`, `claims.mark_paid.scope`, `requests.create.own`, `requests.read.own`, `requests.read.scope`, `requests.review.scope`, `users.read.scope`, `users.manage`, `roles.manage`, `settings.manage`, `audit.read`, `dashboard.read.scope`, `reports.export.scope`.

## Role defaults
- USER: personal work/projects/claims/requests.
- ADMIN: `dashboard.read.scope`, `users.read.scope`, `work.read.scope`, `claims.read.scope`, `requests.read.scope` on explicitly assigned departments/projects. Review/edit/approve/export **not automatic**.
- SUPER_ADMIN: organization-wide management capabilities, except v1 prohibition on self-approval. Role changes only Super Admin, and bootstrap is out-of-band.

## Self-modification and self-approval
- An Admin may correct own DRAFT claim with `claims.edit.own`.
- Admin may edit others' submitted claims **only** with `claims.edit.scope`, correct scope, mandatory reason/audit, and policy-allowed state; no silent amount changes after approval.
- No role may approve their own claim. `claims.approve.scope` applies to **others only**. An administrator may not create a second account to evade policy; actor and beneficiary relationship must be reviewed operationally.
- Request self-approval is also denied for leave/purchase/API access, unless future explicitly approved policy states otherwise. Access provisioning can require segregation of duties.
- Super Admin sets grants per admin, chooses review scope and approval rights, cannot switch on a self-approval toggle in v1.

## API controls
Gateway JWT plus API object-level authorization; use conditional writes, CSRF-safe auth flow when using cookies (or PKCE with secure token handling), strict CORS allowlist, HTTP security headers, rate limits at gateway/WAF where budget allows. All authenticated S3 uploads use scoped presigned URLs after authorization and validated completion. File extensions, MIME sniffing, size caps, content scanning strategy, private bucket, expiring read URLs; never public ACL. For high-risk documents, add malware scanning before public release to reviewers and quarantine unknown files. Audit sensitive events.

## Audit requirements
Immutable append-only: `actorSub`, `action`, `resourceType`, `resourceId`, `oldState`, `newState`, `reason`, `timestamp`, `requestId`, `permissionPolicyVersion`. Redact passwords, secrets, PII from logs. Audit read access only to authorized users. Protect records using restricted IAM and backups; DynamoDB alone does not provide an immutable/WORM guarantee.

## Threat scenarios
IDOR, permission scope leak through query or event channel, forged approval, duplicate claim replay, stale admin privilege after revoke, malicious file upload, overly broad S3 presign, stream duplicate event, audit editing, employee enumeration, excessive exports. Each needs negative tests.

## Operational safeguards
CloudWatch logs with retention, CloudTrail for AWS-level audit as budget allows, DynamoDB PITR (budget explicitly assessed), S3 versioning/lifecycle, encryption, budget alerts. Disable account and revoke sessions for departures. No secrets in git. Backup restore and emergency access drills.
