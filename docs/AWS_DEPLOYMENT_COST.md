# AWS deployment cost boundary

ADR-0006 selects the shared Lightsail deployment documented in `LIGHTSAIL_DEPLOYMENT.md`. WorkPilot reuses the running instance, existing domain, Nginx and certificate. The only application-specific hosted services are a small Cognito User Pool and a private S3 bucket. For at most 10 users, these should remain within free-tier or negligible usage-based cost under normal use, subject to the AWS account's eligibility and actual storage/traffic.

Do not provision a second Lightsail instance, Lightsail distribution, new domain or certificate, RDS, Redis, SES, load balancer, ECR, CloudFront, API Gateway, Lambda or AppSync for this deployment. Any future managed-service design requires a new ADR and cost approval.

## Approved deployment

- Existing Mumbai Lightsail instance (`ap-south-1`), with WorkPilot isolated under `/srv/pacd-projects/PACD-WorkPilot`.
- Existing `registration.pac-d.com` Nginx and TLS endpoint, with WorkPilot at `/workpilot/`.
- WorkPilot-owned Docker Compose services for the static web app, Hono API and PostgreSQL.
- Cognito User Pool Lite with public signup and invitation delivery disabled. The Super Admin creates users and privately supplies one-time credentials.
- Private S3 documents bucket with encryption, versioning, Block Public Access and origin-restricted CORS.

## Cost drivers
| Service | Incremental pricing behavior | Controls |
|---|---|---|
| Existing Lightsail instance/domain/TLS | No new WorkPilot resource | Monitor whether WorkPilot materially changes the existing instance plan or transfer usage |
| Cognito | Monthly active users | At most 10 users; no email, SMS or public signup |
| S3 | Stored bytes, requests and transfer | Small attachments, private access, incomplete-upload lifecycle and retention review |
| Manual/automatic snapshots | Snapshot storage | Retain only the agreed recovery set after restore evidence exists |

Actual charges depend on account free-tier eligibility, stored files, snapshots and traffic. Configure a small AWS Budget alert for unexpected spend; an alert is not a hard billing cap.

## Production launch checklist
1. Complete the pre-change instance snapshot and verify it is available.
2. Use least-privilege Cognito/S3 runtime credentials and never commit production secrets.
3. Disable Cognito public signup and all invitation delivery; bootstrap exactly one Super Admin safely.
4. Enable S3 encryption, versioning and Block Public Access; test restricted downloads and expired presigns.
5. Keep PostgreSQL private to the WorkPilot Docker network and test a logical backup restore.
6. Bind the WorkPilot web port to loopback, add API rate limiting and keep the Lightsail firewall closed for ports 3000, 5432 and 8080.
7. Validate the deployed UI, run smoke tests for all existing sites and retain a rollback plan.

## Local dev
Use local PostgreSQL and local adapters for routine development; integration suites against dedicated hosted staging resources only after approval. No checked-in AWS credentials, database passwords or actual password fixtures.

## References

- https://aws.amazon.com/cognito/pricing/
- https://aws.amazon.com/s3/pricing/
- https://aws.amazon.com/lightsail/pricing/
- https://docs.aws.amazon.com/cognito/latest/developerguide/how-to-create-user-accounts.html
