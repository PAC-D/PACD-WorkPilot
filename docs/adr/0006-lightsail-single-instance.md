# ADR-0006: Lightsail single-instance deployment and manual credential handoff

**Status:** Accepted by product owner | **Date:** 2026-11-20

## Context
PACD WorkPilot serves at most 10 active accounts. The product owner selected an existing shared Amazon Lightsail instance in Mumbai and cannot operate an email delivery integration. The instance already terminates HTTPS for `registration.pac-d.com` and hosts separately managed Matalan, Primark and PAC-D projects. The previous AWS candidate used several managed runtime components and Cognito email invitations, which creates unnecessary cost and deployment work for this installation.

## Decision
Deploy the existing modular monolith under `/srv/pacd-projects/PACD-WorkPilot` on the shared Amazon Lightsail Linux instance with Docker Compose:

- Existing host Nginx and its Certbot certificate serve `https://registration.pac-d.com/workpilot/` and proxy to a WorkPilot web container bound only to `127.0.0.1:8080`.
- The production browser paths use `/workpilot/`; host Nginx strips that deployment prefix before forwarding SPA and `/api/*` requests to the container.
- One Node.js process runs the Hono API with a bounded five-connection pool.
- PostgreSQL 16 runs on the private Compose network with a named persistent volume; its port is not published.
- Amazon Cognito remains the only production password authority. Public registration stays disabled.
- Private claim files remain in S3. The browser still receives only scoped presigned URLs.
- Cognito and S3 use `ap-south-1`, matching the Lightsail instance. This region decision overrides ADR-0005's earlier `eu-north-1` staging choice.
- No second instance, Lightsail distribution, new domain/certificate, RDS, Redis, SES, load balancer, ECR or CloudFront is introduced.

Hosted Super Admin account creation calls Cognito `AdminCreateUser` with `MessageAction=SUPPRESS` and a Super Admin-supplied temporary password. Email is optional profile data and is not a delivery dependency. The temporary password crosses the authenticated HTTPS API once, is passed directly to Cognito, and is never logged, stored, audited, included in an idempotency record, or returned. Cognito forces password replacement on first sign-in. The Super Admin communicates the username and temporary password out of band.

The initial Super Admin is bootstrapped out of band: an operator creates the matching Cognito user with suppressed delivery, copies its immutable Cognito `sub`, and runs the one-time database bootstrap command. Bootstrap refuses to run if any Super Admin already exists and writes an audit record.

## Security and operational boundaries

- This decision does not approve a custom password database or production local-auth mode.
- Existing ports 80/443 remain owned by host Nginx and SSH is tightly restricted. WorkPilot publishes only a loopback port; PostgreSQL and the API container are never public ports.
- Existing Matalan and Primark directories, containers and Nginx routes are out of scope. Before each host-Nginx change, back up its configuration, validate with `nginx -t`, reload gracefully and smoke-test every existing site.
- Runtime AWS credentials are scoped to the selected Cognito user pool and private S3 bucket and are stored only in the root-readable server environment file or an approved secret mechanism.
- Instance snapshots are not the only database backup. A restore-tested PostgreSQL logical backup to separate storage is required before production signoff.
- Lightsail instance/volume failure affects the whole application. This is accepted for the small installation; restore procedure and recovery time must be tested.
- The existing transactional outbox remains. A hosted event publisher is still required for the five-second live-update target; until it is implemented, mutation invalidation plus focus/reconnect/manual refresh are the safe reconciliation paths.

## Consequences

The marginal runtime cost is limited to small S3 and backup usage because compute, TLS and the domain already exist. The tradeoff is a shared single-instance failure domain and operator-owned database patching, backup, restore, monitoring, and capacity management. Scaling to multiple API instances or moving PostgreSQL to a managed provider requires a later ADR.
