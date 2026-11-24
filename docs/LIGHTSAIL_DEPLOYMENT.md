# Shared Lightsail deployment runbook

This is the approved <=10-user deployment from ADR-0006. WorkPilot shares the existing Mumbai Lightsail instance but remains isolated from separately managed Matalan and Primark projects. Complete the security, backup, restore, and smoke-test checklist before treating the deployment as production-ready.

## Fixed deployment boundary

- Repository: `/srv/pacd-projects/PACD-WorkPilot`
- Public URL: `https://registration.pac-d.com/workpilot/`
- Host upstream: `127.0.0.1:8080`
- AWS region: `ap-south-1`
- Docker project/network/volumes: `pacd-workpilot`
- Existing host Nginx owns ports 80/443 and the Certbot certificate.
- WorkPilot must not modify or restart Matalan/Primark directories, containers, routes, or services.
- PostgreSQL and the Hono API are reachable only inside the WorkPilot Docker network.

No second Lightsail instance, Lightsail distribution, new domain/certificate, RDS, Redis, SES, load balancer, ECR or CloudFront is required.

## 1. Before any server change

1. Create a manual Lightsail snapshot and wait for it to become available.
2. Record successful responses for the existing registration, Matalan and Primark URLs.
3. Back up `/etc/nginx/sites-available/registration` to a dated root-owned file.
4. Confirm port 8080 is unused and the server has sufficient disk/memory.
5. Restrict SSH in both Lightsail IPv4 and IPv6 firewalls to administrator source addresses. Do not open 3000, 5432 or 8080.

## 2. AWS prerequisites

1. Create an `ap-south-1` Cognito User Pool using the Lite tier, with public signup disabled, a public app client without a client secret, username/password sign-in, seven-day temporary credentials, and the documented 12-character password policy. Do not require email or phone; email is optional profile data.
2. Create a private `ap-south-1` S3 bucket with every Block Public Access control enabled, default encryption, versioning, and CORS limited to `https://registration.pac-d.com`.
3. Create a least-privilege runtime AWS credential limited to the selected Cognito pool and S3 bucket. Never use root credentials or place credentials in git.

## 3. Repository and environment

Clone the public repository only into the PAC-D project boundary:

```bash
cd /srv/pacd-projects
git clone https://github.com/PAC-D/PACD-WorkPilot.git
cd PACD-WorkPilot
```

Create the ignored production environment:

```bash
cp deploy/lightsail.env.example deploy/lightsail.env
chmod 600 deploy/lightsail.env
```

Replace every placeholder. Generate independent random values for `POSTGRES_PASSWORD` and `CURSOR_SECRET`. `WEB_ORIGIN` is the origin only (`https://registration.pac-d.com`), without `/workpilot`. Never put the Super Admin temporary password in this file.

Validate the Compose model before starting anything:

```bash
WORKPILOT_ENV_FILE=deploy/lightsail.env docker compose \
  --env-file deploy/lightsail.env -f compose.production.yaml config
```

## 4. Start the isolated WorkPilot stack

```bash
WORKPILOT_ENV_FILE=deploy/lightsail.env docker compose \
  --env-file deploy/lightsail.env -f compose.production.yaml up -d --build

WORKPILOT_ENV_FILE=deploy/lightsail.env docker compose \
  --env-file deploy/lightsail.env -f compose.production.yaml ps

WORKPILOT_ENV_FILE=deploy/lightsail.env docker compose \
  --env-file deploy/lightsail.env -f compose.production.yaml logs --tail=100 api web migrate
```

The web container publishes only `127.0.0.1:8080`. The migration container must exit successfully before the API starts. Verify `http://127.0.0.1:8080/` from the host before changing Nginx.

The production Dockerfiles install the exact `pnpm` version pinned by `packageManager`; do not replace this with `corepack enable`, because the selected Node 26 image does not bundle Corepack.

## 5. Add the existing Nginx path route

Install the rate-limit zone and location snippet from `deploy/host-nginx/`. Add the location snippet only inside the existing `registration.pac-d.com` HTTPS server block, before its catch-all `location /` block.

The snippet includes a dedicated `/workpilot/api/v1/events` SSE route with proxy buffering disabled. Keep it ahead of the general API location so connected authorized viewers receive invalidation hints promptly.

Before reload:

```bash
sudo nginx -t
```

If and only if validation succeeds:

```bash
sudo systemctl reload nginx
```

A reload is graceful; do not restart the server or unrelated containers. Verify the registration root, existing registration subpaths, Matalan and Primark URLs immediately, then verify `/workpilot/` and a deep link such as `/workpilot/dashboard`.

## 6. Bootstrap the initial Super Admin

In Cognito, create the `BOOTSTRAP_SUPER_ADMIN_USERNAME` user with invitation delivery suppressed and set a strong one-time temporary password. Do not put that password in the environment file, shell history, repository, logs, or database. Copy the immutable Cognito `sub` into `BOOTSTRAP_SUPER_ADMIN_SUB`, then run:

```bash
WORKPILOT_ENV_FILE=deploy/lightsail.env docker compose \
  --env-file deploy/lightsail.env -f compose.production.yaml run --rm api \
  node --experimental-strip-types apps/api/src/db/bootstrap-super-admin.ts
```

The command succeeds only when no Super Admin exists. Sign in, replace the temporary password, and verify Users & Access and Audit. The Super Admin then creates every other account and hands off one-time credentials through an approved private channel. No email is sent.

## 7. Update and rollback

Before an update, create a PostgreSQL logical backup. Keep the pre-deployment instance snapshot until WorkPilot and all existing sites have remained healthy for the agreed observation period. Pull only reviewed `main`, then rerun the same Compose `up -d --build` command.

Migrations are checksum-verified and forward-only. Application rollback cannot silently reverse a schema migration. Keep the prior git revision/image until smoke tests pass.

If host Nginx validation or any existing-site smoke test fails, restore the backed-up registration configuration, run `sudo nginx -t`, gracefully reload Nginx, and stop only the `pacd-workpilot` Compose project.

## 8. Required production evidence

- Restore a PostgreSQL logical backup into a clean database and record the result.
- Enable automatic instance snapshots or document the manual snapshot schedule.
- Verify Cognito public signup is off and account creation sends no email.
- Verify first login forces replacement of the one-time password.
- Confirm 3000, 5432 and 8080 are unreachable publicly over IPv4 and IPv6.
- Confirm `/workpilot/api/*` rate limiting returns HTTP 429 under sustained excess traffic.
- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, integration tests and deployed smoke tests.
- Configure budget, disk, memory, container restart, backup failure and API error alerts.

AWS references: [Cognito AdminCreateUser](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminCreateUser.html), [S3 Block Public Access](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html), [Lightsail snapshots](https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-snapshots-in-amazon-lightsail.html), and [Lightsail firewall](https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-firewall-and-port-mappings-in-amazon-lightsail.html).
