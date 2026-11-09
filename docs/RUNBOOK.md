# Operational runbook (baseline)

## User onboarding
In a hosted environment, Super Admin uses user management to create an account with a unique username/employee code and role; the approved identity provider issues the credential and first-login challenge. Local development uses fictional selectable identities and no passwords. No shared admin passwords. Privileged role grants require reason and audit.

## Admin approval incident
If unauthorized approval suspected: disable account/revoke sessions; preserve audit; inspect claims approval state and transaction records; do not erase history; correct via explicit reversal workflow (future contract) or documented manual financial reconciliation; rotate affected access.

## Live events disconnected
Show browser connection indicator and manual Refresh. Verify the selected event adapter's channel authorization, outbox publisher errors and permissions. Core CRUD should still work. After reconnect reload active queries once.

## Data recovery
Confirm stage, incident scope and point in time; restore PostgreSQL backup/PITR into a **new** database, run integrity checks, and perform controlled cutover through configuration. Restore private files through the selected storage backup/versioning policy and test document references. Never blindly overwrite production.

## Cost alerts
Review hosted API calls and compute, PostgreSQL compute/storage/connections, private file storage and egress, event connection-minutes, and log ingestion. Detect unplanned polling, connection leaks or high fanout.

## Local database
Start with `pnpm db:up`, apply migrations with `pnpm db:migrate`, and verify connectivity with `pnpm db:check`. `pnpm db:down` stops PostgreSQL without deleting its named volume. Volume deletion is destructive and is never part of the normal command.

## Daily operations
Review errors, failed outbox events, unauthorized access spikes and unprocessed approvals. This is an **operator checklist**, not a scheduled dashboard polling requirement.
