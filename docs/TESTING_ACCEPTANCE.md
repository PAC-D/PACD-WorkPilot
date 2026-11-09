# Quality gates and acceptance tests

## Required levels
- Unit: Zod schemas, state machines, policy evaluation, date/month handling, query key mapping, idempotency logic.
- Integration: DynamoDB conditional transactions, indexes and bounded Query, Cognito mock/staging, upload finalization, event publisher duplicate stream delivery, authorized AppSync subscriptions.
- API E2E: role/scope denial and allowed reads/writes, workflow review lifecycle, optimistic concurrency (409), pagination cursor signature/failure, idempotent retry.
- Browser E2E: Playwright user/admin/super-admin flows, responsive layouts, keyboard navigation, connectivity loss/recovery, stale cache clearing on role change.
- Security: cross-employee IDOR, forged admin grants, self-approval with all roles, cross-scope event leak, download authorization, invalid MIME, malicious upload, stale roles, brute-force protection.

## Critical test cases
1. 30 accounts, 3 roles and multiple scopes: only authorized rows and aggregate charts appear.
2. Admin can be granted `claims.read.scope` without `claims.approve.scope`; GET works, POST approval 403.
3. Admin with approve permission cannot approve own claim. Even Super Admin cannot approve own claim in v1.
4. User invited with temporary password must set new password; PACD WorkPilot never logs or returns password after invite flow.
5. Claim submitted in Nov for October appears under October; travel permits multiple, mobile duplicate blocked via transactional marker.
6. Two simultaneous approval requests produce only one successful status transition and one audit decision.
7. Project assignments track assignedAt, startDate, plannedEndDate, actualEndDate independently.
8. A user mutation invalidates authorized Admin charts and tables through event; no interval requests observed over idle 10-minute browser session.
9. Missed event while offline reconciles once after reconnect; permissions revoked mid-session remove restricted cache and subscription.
10. Event from department A cannot be observed on department B authorized connection.
11. Large query always applies page limit, stable cursor and index; no Scan in request API.
12. Different chart representations show matching counts and accessible fallback table.
13. Unknown/expired upload presign cannot yield readable shared file; authorization on every download.
14. Simulate outage: DB throttling, event publisher failure, stale token, partial S3 upload and recovery.

## Release gates
`lint`, `typecheck`, unit/integration/E2E, dependency audit, contract compatibility check, infrastructure synth/security review, accessibility audit, backup restore test, deployment smoke test. Record test evidence; never declare production ready based on unit tests alone.

## Performance budget (targets not promises)
Desktop frontend core route <=3s under target office network; ordinary warmed API p50 <=500ms; 95th percentile dashboard refresh <=5s when websocket healthy; all list endpoints capped limit 100; no periodic polling request in idle trace. Measure in staging with 30 modeled accounts.
