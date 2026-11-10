# ADR-0005: AWS staging application adapters

**Status:** Accepted by product owner | **Date:** 2026-11-10

## Decision
Prepare the application for an AWS staging environment in `eu-north-1` without provisioning resources in this change. Use an invite-only Amazon Cognito User Pool for hosted identity and a private Amazon S3 bucket for hosted file content. Local PostgreSQL identity and metadata adapters remain available only in non-production development.

The React public client uses the modular AWS Amplify Auth APIs with a Cognito app client that has no client secret. The Hono API verifies Cognito access tokens with `aws-jwt-verify`, then reloads the active application profile and effective grants from PostgreSQL for every request. Cognito groups or browser claims never replace application authorization.

The Hono API uses the official AWS SDK S3 client to issue short-lived, object-specific presigned PUT and GET URLs. The browser never receives AWS credentials. File metadata is created before upload and finalized only after S3 metadata confirms the contracted MIME type and maximum 5,000,000-byte size.

## Identity policy
- Public self-registration is disabled.
- Super Admin provisioning uses Cognito administrator APIs in a later server-side provisioning increment; no temporary password is returned by PACD WorkPilot.
- Cognito emails the invitation and temporary password; temporary credentials expire after 7 days.
- Permanent passwords require at least 12 characters with uppercase, lowercase, number and special-character classes.
- First sign-in completes Cognito's `NEW_PASSWORD_REQUIRED` challenge. Passwords and provider challenge material are never sent to the PACD WorkPilot API or stored in PostgreSQL.
- MFA remains deferred under ADR-0003.

## Boundaries
This ADR approves application dependencies and adapters only. It does not create AWS resources, select the final API compute runtime, or select the hosted PostgreSQL topology. Those infrastructure choices still require the deployment ADR mandated by ADR-0004.

## Consequences
- Hosted environment configuration must provide the Cognito pool/client identifiers, AWS region and S3 bucket name through secrets or deployment configuration.
- Local mode remains simple and incurs no AWS calls.
- Hosted startup fails closed when required identity or file configuration is absent.
- S3 CORS, bucket public-access blocking, encryption, lifecycle, malware policy and IAM least privilege must be configured during AWS setup.
