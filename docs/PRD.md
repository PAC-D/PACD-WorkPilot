# Product Requirements Document (PRD)

**Product:** PACD WorkPilot | **Version:** 1.0 | **Population:** <=30 active accounts | **Status:** v1 baseline

## Outcome
An employee can submit a work update, expense receipt or request in under 60 seconds after opening its form (excluding file transfer). An authorized administrator sees changes promptly **without recurring fetch timers**. The interface must be understandable to non-technical employees on desktop and phone.

## Actors
- USER: self-service; own work/claims/requests, assigned projects.
- ADMIN: organization-wide read visibility in v1; create, assign, configure, review, approve and edit rights remain granular grants set by Super Admin.
- SUPER_ADMIN: administers accounts, permissions, departments, projects, request form templates, claim policy, and audit. Sensitive self-approvals still denied unless explicit super-admin policy plus audit requirements are met; v1 disallows them entirely to prevent conflict of interest.

## Module requirements
### Identity and user provisioning
Super Admin adds employee code (unique), display name, username, optional email/phone, department, role(s), scopes, then provisions an account through the approved hosted identity provider. The hosted provider must issue and rotate credentials; force credential change on first login when supported. Account actions: disable/enable, reset credential, revoke sessions, role assignment, permission grants/revocations. Public registration is disabled. Passwords are never stored in PACD WorkPilot PostgreSQL. Local development uses selectable fictional identities, never real credentials. MFA is deferred for v1 by product-owner decision; the identity adapter must remain compatible with enabling hosted-provider MFA later. See ADR-0003 and ADR-0004.

### Projects
Project code, name, owner, description, start date, planned end date, actual end date, status (PLANNED/ACTIVE/ON_HOLD/COMPLETED/ARCHIVED), member assignments, assignment date, assigned_by, optional due date per member. Each project may be visible to approved members/admin scopes. User may request to join; no automatic access to unassigned project. Track assignment and removal history.

### Work activities
Project, title, category, notes, date, status (PLANNED/IN_PROGRESS/BLOCKED/COMPLETED), optional attachment, optional time spent. Updates to same activity are appended to activity history. Search/filter by date, project, employee, category, status. No productivity rankings or mandatory activity timer. Admin has organization-wide read visibility; write and review actions still require explicit grants.

### Monthly claims
Use term **Claims** (not quotations). Types: MOBILE_BILL, INTERNET_BILL, TRAVEL_ALLOWANCE and configuration-defined types. Each has `periodMonth YYYY-MM`, amount minor units + currency BDT, supporting attachments, memo, created/submitted dates; states DRAFT/SUBMITTED/UNDER_REVIEW/NEEDS_INFO/APPROVED/REJECTED/PAID. Only server-approved transitions. Claim policy can define per-category caps, deadlines and one-active-claim-per-period for mobile/internet; travel may have multiple claims. Reject/needs-info requires reason. Edits after submission require claim return to NEEDS_INFO, resubmit, or explicit scoped override with audit. Reimbursement does not imply payment; mark PAID only when granted.

### Requests
Types: SOFTWARE_INSTALL, LEAVE, API_ACCESS, PURCHASE, IT_SUPPORT, GENERAL. Server allowlists per-type configurable fields; always have title, reason, status, requester, reviewer scope, timestamps. States DRAFT/SUBMITTED/IN_REVIEW/NEEDS_INFO/APPROVED/REJECTED/FULFILLED/CLOSED/CANCELLED. Approved is distinct from fulfilled. Single-step approval in v1; Super Admin handles assignment and acceptance by default. An Admin may do so only after an explicit Super Admin grant. Design remains extensible through an `approvalSteps` array for later multi-step review. Leave entitlement balance tracking is out of scope for v1; leave request dates are tracked.

### Dashboard
Employee: recent activities, active projects, current month claim state, request counts, action list.
Admin: authorized employee/project activity, pending claims and requests, blocked work, upcoming/delayed projects. Interactive bar/line for updates grouped by day/week, donut/pie for project status or request mix, project timeline table with start/planned/actual end, assignment timestamp, member count. All charts use authorized aggregates only. Charts have table alternatives and clear empty states. Super Admin adds organization overview and configuration.

### Common UX
Page-based navigation, clear action verbs, shared table/filter/search/date/month selectors, confirmation of destructive or approval actions, actionable notifications, accessible keyboard navigation, responsive layouts. No emoji, gratuitous headings/tags, em dashes, large animations or dense dashboards. UI palette specified in `UI_DESIGN_SYSTEM.md`.

## Core business invariants
- No account self-registration. Only Super Admin can create admins or super admins; bootstrap first account via one-time secured admin provisioning.
- Admin can modify or approve another user's claim only with explicit permission **and matching scope**. `claims.edit.own` does not imply `claims.edit.scope`; `claims.approve.scope` never implies self-approval.
- Claims self-approval disabled across **all roles** in v1, irrespective of UI setting. Super Admin configuration displays this as a locked policy; any future exception requires security ADR, dual control and tested policy changes.
- A request or claim receives a unique non-guessable ID and immutable creator. Approval actions audit actor, from/to state, timestamp, reason, policy version.
- Same logical mutation cannot double-submit under retry: `Idempotency-Key` and conditional writes.
- Month and timezone rules from README. No destructive deletion of historical approvals.

## Out of scope v1
Payroll, attendance biometrics, employee rating, invoice accounting ERP, automatic expense settlement, AI summaries, public portal, arbitrary custom fields with code execution, multi-organization SaaS, HR legislation compliance claims, advanced leave accrual, mobile native app.

## Non-functional requirements
Target <=30 accounts, responsive dashboard; initial app load under 3s on typical office broadband after static files cached (target, measure in UAT); median ordinary API under 500ms warm (target only); authorized updates normally reflected within 5s while clients connected (best-effort, no delivery guarantee). Zero scheduled polling; one-time reconnect/focus reconciliation. WCAG 2.2 AA-minded design; auditability; secure uploads; restore testing. No claims of guaranteed SLAs without measured evidence.

## Acceptance examples
1. USER creates claim for October on November 9; October report shows it.
2. A User cannot see another employee's claim or subscribe to that employee's event channel; Admin organization-wide read remains server-authorized and does not grant approval.
3. Admin without `claims.approve.scope` sees no approve action; direct API POST is 403.
4. Attempt to self-approve is 403 even if assigned broad admin rights.
5. USER updates activity; Admin connected to matching authorized channel receives invalidation and active chart/list refresh without timer.
6. Connection drops; on reconnect active dashboard reconciles once to avoid missed event divergence.
7. Project assignment date, planned end, and actual end are separately visible and auditable.
