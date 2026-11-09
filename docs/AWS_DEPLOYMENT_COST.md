# AWS deployment and cost-control guide

## Baseline deployment
- `us-east-1` is **an illustrative default only**; choose final region based on organizational data-residency, latency to Bangladesh, availability and price before CDK deployment. Document region decision.
- S3 private bucket + CloudFront OAC to serve Vite static SPA. SPA routing via appropriate CloudFront error response; ensure 403 handling does not mask API errors.
- API Gateway **HTTP API** JWT authorizer + Hono Lambda (Node.js). Zero VPC/NAT in v1. Configure sensible concurrency/timeout and API throttling.
- DynamoDB on-demand: tables and GSIs from DATA_MODEL; PITR based on budget/risk.
- Cognito User Pool Lite, invite-only; admin-created temporary passwords.
- Private S3 documents bucket with SSE, block public access, CORS limited to frontend origin, lifecycle for incomplete uploads, no public links.
- AppSync Events + DynamoDB Streams publisher Lambda for live invalidations, authenticated channels only.
- CloudWatch logs and alerts; AWS Budgets monthly alerts; CDK TypeScript least-privilege IAM.

## Cost drivers
| Service | Pricing behavior | Controls |
|---|---|---|
| S3 + CloudFront | GB-month, requests, transfer | optimized assets, cache headers, small uploads |
| API Gateway HTTP API | per request + data | avoid polling, consolidate summary endpoint |
| Lambda | invocations + duration | short handlers, no cold-start-heavy DB connector |
| DynamoDB on-demand | requests + storage + indexes/PITR | indexed Query, narrow items, capped requests, use summary items |
| Cognito | MAUs + optional SMS/email features | no SMS by default, choose Lite features intentionally |
| AppSync Events | operations and connection minutes | subscribe only on signed-in sessions/active tabs, scoped events |
| CloudWatch | ingestion + retention/metrics | 14–30 day log retention as suitable, redact PII |
| Domain/DNS | Route 53/registrar | optional |

**Do not hardcode a monthly dollar quote.** Actual charges depend on AWS region, account free-tier eligibility, data transfer, connection-minutes, storage and traffic. Before launch use the AWS Pricing Calculator with assumptions 30 users, 20 business days, normal daily CRUD, document storage by month, average open-dashboard hours and event fanout, then record estimate in `docs/OPEN_DECISIONS.md`. Set monthly budget alarms at e.g. $5/$10/$20 or locally suitable values; alerts are not hard billing caps. AppSync live connections incur connection-minute usage even without periodic fetches.

## Production launch checklist
1. Select region and data retention; enable CloudTrail and AWS Budgets.
2. Set deployment role with scoped IAM; separate staging/prod stacks, accounts if feasible.
3. Disable Cognito public signup, enforce password policy and privileged MFA; bootstrap one Super Admin safely.
4. Enable encrypted buckets and private CloudFront origin; test restricted downloads/expired presigns.
5. Enable DynamoDB PITR if approved; set alarms for throttling, Lambda errors, DLQ/failed stream delivery, websocket auth denial anomalies.
6. Configure event publishing dedupe and failure destination; alarms and manual refresh fallback.
7. Test restore from backup and re-provision permissions.
8. Verify no infinite retries, runaway Lambda concurrency, overbroad IAM, or unbounded data-export.
9. Validate deployed UI at mobile sizes and keyboard navigation.
10. Run smoke tests, change-log release, rollback plan.

## Local dev
Use local mocks/fixtures for UI and mocked AWS SDK services for service unit tests; integration suites against dedicated AWS staging resources. If a DynamoDB Local container is needed for testing it does **not** change production stack. No checked-in AWS credentials or actual password fixtures.

## References
https://aws.amazon.com/lambda/pricing/
https://aws.amazon.com/api-gateway/pricing/
https://aws.amazon.com/dynamodb/pricing/
https://aws.amazon.com/cognito/pricing/
https://aws.amazon.com/appsync/pricing/
https://docs.aws.amazon.com/cognito/latest/developerguide/how-to-create-user-accounts.html
