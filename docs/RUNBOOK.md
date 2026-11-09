# Operational runbook (baseline)

## User onboarding
Super Admin uses user-management UI to create account with unique username/employee code and role; Cognito issues temporary credential, user changes it at first login. No shared admin passwords. Privileged role grant requires reason and audit.

## Admin approval incident
If unauthorized approval suspected: disable account/revoke sessions; preserve audit; inspect claims approval state and transaction records; do not erase history; correct via explicit reversal workflow (future contract) or documented manual financial reconciliation; rotate affected access.

## Live events disconnected
Show browser connection indicator and manual Refresh. Verify AppSync channel auth, event publisher Lambda errors, stream failures and permissions. Core CRUD should still work. After reconnect reload active queries once.

## Data recovery
Confirm stage, incident scope and point in time; restore DynamoDB PITR into **new** tables, verify integrity, and perform controlled cutover via IaC/config. Restore files via S3 versioning/backup policy; test document references. Never blindly overwrite production without recovery plan.

## Cost alerts
Review API Gateway calls, Lambda duration/errors, DynamoDB capacity and hot partitions, S3/CloudFront egress, AppSync connection-minutes, CloudWatch log ingestion. Detect unplanned polling or high fanout.

## Daily operations
Review errors, failed stream events, unauthorized access spikes and unprocessed approvals. This is an **operator checklist**, not a scheduled dashboard polling requirement.
