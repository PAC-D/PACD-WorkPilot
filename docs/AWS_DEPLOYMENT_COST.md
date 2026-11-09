# AWS deployment and cost-control guide (candidate only)

ADR-0004 makes the application local-first and PostgreSQL-based. This document is retained as an AWS candidate, not an approved deployment. Do not provision resources until the company approves the account, region, IAM deployment role and budget.

## Baseline deployment
- `us-east-1` is **an illustrative default only**; choose final region based on organizational data-residency, latency to Bangladesh, availability and price before CDK deployment. Document region decision.
- S3 private bucket + CloudFront OAC to serve Vite static SPA. SPA routing via appropriate CloudFront error response; ensure 403 handling does not mask API errors.
- API Gateway **HTTP API** JWT authorizer + Hono Lambda (Node.js). Zero VPC/NAT in v1. Configure sensible concurrency/timeout and API throttling.
- Managed PostgreSQL choice pending: Aurora Serverless/RDS must follow the portable migrations and an approved connection strategy, backup policy and cost estimate.
- Cognito User Pool Lite, invite-only; admin-created temporary passwords.
- Private S3 documents bucket with SSE, block public access, CORS limited to frontend origin, lifecycle for incomplete uploads, no public links.
- AppSync Events remains a candidate transport; a durable publisher reads committed PostgreSQL outbox events, authenticated channels only.
- CloudWatch logs and alerts; AWS Budgets monthly alerts; CDK TypeScript least-privilege IAM.

## Cost drivers
| Service | Pricing behavior | Controls |
|---|---|---|
| S3 + CloudFront | GB-month, requests, transfer | optimized assets, cache headers, small uploads |
| API Gateway HTTP API | per request + data | avoid polling, consolidate summary endpoint |
| Lambda | invocations + duration | short handlers, no cold-start-heavy DB connector |
| Managed PostgreSQL | compute, storage, I/O, backups and connections | scale-to-zero where approved, bounded pool/Data API, indexed keyset queries |
| Cognito | MAUs + optional SMS/email features | no SMS by default, choose Lite features intentionally |
| AppSync Events | operations and connection minutes | subscribe only on signed-in sessions/active tabs, scoped events |
| CloudWatch | ingestion + retention/metrics | 14–30 day log retention as suitable, redact PII |
| Domain/DNS | Route 53/registrar | optional |

**Do not hardcode a monthly dollar quote.** Actual charges depend on AWS region, account free-tier eligibility, data transfer, connection-minutes, storage and traffic. Before launch use the AWS Pricing Calculator with assumptions 30 users, 20 business days, normal daily CRUD, document storage by month, average open-dashboard hours and event fanout, then record estimate in `docs/OPEN_DECISIONS.md`. Set monthly budget alarms at e.g. $5/$10/$20 or locally suitable values; alerts are not hard billing caps. AppSync live connections incur connection-minute usage even without periodic fetches.

## Production launch checklist
1. Select region and data retention; enable CloudTrail and AWS Budgets.
2. Set deployment role with scoped IAM; separate staging/prod stacks, accounts if feasible.
3. Disable Cognito public signup, enforce the approved password and session policy, monitor sign-in failures, and bootstrap one Super Admin safely. MFA is deferred in ADR-0003 and should be reconsidered before production signoff.
4. Enable encrypted buckets and private CloudFront origin; test restricted downloads/expired presigns.
5. Enable PostgreSQL backups/PITR if approved; set alarms for connections, storage, compute, Lambda errors, failed outbox delivery and event authorization anomalies.
6. Configure event publishing dedupe and failure destination; alarms and manual refresh fallback.
7. Test restore from backup and re-provision permissions.
8. Verify no infinite retries, runaway Lambda concurrency, overbroad IAM, or unbounded data-export.
9. Validate deployed UI at mobile sizes and keyboard navigation.
10. Run smoke tests, change-log release, rollback plan.

## Local dev
Use local PostgreSQL and local adapters for routine development; integration suites against dedicated hosted staging resources only after approval. No checked-in AWS credentials, database passwords or actual password fixtures.

## References
https://aws.amazon.com/lambda/pricing/
https://aws.amazon.com/api-gateway/pricing/
https://aws.amazon.com/dynamodb/pricing/
https://aws.amazon.com/cognito/pricing/
https://aws.amazon.com/appsync/pricing/
https://docs.aws.amazon.com/cognito/latest/developerguide/how-to-create-user-accounts.html
