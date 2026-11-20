# Lightsail deployment runbook

This is the approved small-installation path from ADR-0006. It creates no resources automatically. Complete the security, backup, restore, and smoke-test checklist before treating the deployment as production-ready.

## 1. AWS prerequisites

Use the approved AWS region consistently for Lightsail, Cognito, and S3.

1. Create a Lightsail Linux instance with enough memory for Docker, PostgreSQL, the Node API, and image builds. Attach a static IP.
2. Restrict SSH to the administrator's source IP. Open port 80 for the Lightsail distribution origin. Do not open 3000 or 5432.
3. Create a Cognito user pool with public signup disabled, a public app client without a client secret, username/password sign-in, a seven-day temporary credential, and the documented 12-character password policy. Do not configure email or phone as a required attribute; email is optional profile data in this installation.
4. Create a private S3 bucket with public access blocked, encryption enabled, and the existing upload CORS/metadata policy.
5. Create a least-privilege runtime AWS credential that can perform only the application's Cognito administrator operations and required S3 object/metadata operations for these named resources.

## 2. Server configuration

Install Docker Engine with the Compose plugin, clone this repository to a dedicated application directory, then create the ignored environment file:

```bash
cp deploy/lightsail.env.example deploy/lightsail.env
chmod 600 deploy/lightsail.env
```

Replace every placeholder. Generate independent random values for `POSTGRES_PASSWORD` and `CURSOR_SECRET`. Set `WEB_ORIGIN` to the final HTTPS distribution address or custom domain. Never place the server environment file in git.

Build, migrate, and start the stack:

```bash
docker compose --env-file deploy/lightsail.env -f compose.production.yaml up -d --build
docker compose --env-file deploy/lightsail.env -f compose.production.yaml ps
docker compose --env-file deploy/lightsail.env -f compose.production.yaml logs --tail=100 api web migrate
```

Only Nginx is published on host port 80. PostgreSQL and the API stay inside the Compose network. The migration container must exit successfully before the API starts.

## 3. Bootstrap the only initial Super Admin

In Cognito, create the `BOOTSTRAP_SUPER_ADMIN_USERNAME` user with invitation delivery suppressed and set a strong one-time temporary password. Do not put that password in the environment file, shell history, repository, logs, or database. Copy the Cognito user's immutable `sub` into `BOOTSTRAP_SUPER_ADMIN_SUB`, then run:

```bash
docker compose --env-file deploy/lightsail.env -f compose.production.yaml run --rm api \
  node --experimental-strip-types apps/api/src/db/bootstrap-super-admin.ts
```

The command succeeds only when no Super Admin exists. Sign in through the application, replace the temporary password, and verify Users & Access and Audit. After this, the Super Admin creates all USER, ADMIN, or additional SUPER_ADMIN accounts in Users & Access, chooses a one-time password, and gives it to the user through an approved private channel. No email is sent.

## 4. HTTPS distribution

Create a Lightsail distribution with the instance as its HTTP origin. Use the dynamic-content caching preset, allow `GET`, `HEAD`, `OPTIONS`, `PUT`, `PATCH`, and `POST`, and forward the `Authorization` and `Origin` headers. Configure `/api/*` as non-cacheable. Use the distribution's HTTPS address, a Lightsail web address, or attach a validated certificate for a custom domain. Rebuild the web image if the Cognito pool/client changes.

## 5. Update and rollback

Before every update, take a database logical backup and an instance snapshot. Pull the reviewed revision, then rerun the same `docker compose ... up -d --build` command. Migrations are checksum-verified and forward-only; application rollback cannot silently reverse a schema migration. Keep the prior image/revision until smoke tests pass.

## 6. Required production evidence

- Restore a PostgreSQL logical backup into a clean instance and record the result.
- Enable automatic instance snapshots and a separate encrypted PostgreSQL backup with retention.
- Verify Cognito public signup is off and account creation sends no email.
- Verify the first Super Admin and all later users must replace the one-time password.
- Confirm ports 3000 and 5432 are unreachable publicly.
- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and the integration/smoke tests.
- Configure budget, disk, memory, container restart, backup failure, and API error alerts.

AWS references: [Cognito AdminCreateUser](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminCreateUser.html), [Lightsail distribution HTTPS](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-faq-cdn-distributions.html), [Lightsail distribution caching](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-changing-default-cache-behavior.html), and [Lightsail firewall](https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-firewall-and-port-mappings-in-amazon-lightsail.html).
