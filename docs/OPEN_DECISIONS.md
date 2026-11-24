# Explicit open decisions (do not invent answers)

All changes require product-owner decision and, when technical choices change, an ADR.

| Decision | Working default | Owner acceptance required |
|---|---|---|
| Hosted AWS region | `ap-south-1` (Mumbai), matching the shared Lightsail instance | Resolved 2026-11-21; ADR-0006 overrides ADR-0005 region |
| Hosted runtime/provider | Amazon Lightsail single instance with Docker Compose (ADR-0006) | Resolved 2026-11-20 |
| Hosted PostgreSQL | PostgreSQL 16 on the Lightsail instance; restore-tested external logical backup required | Resolved 2026-11-20 |
| Organization timezone | `Asia/Dhaka` | Confirm |
| Claim type limits/caps | Accepted: no auto-payment; optional policy caps initially unset | Resolved 2026-11-09 |
| Duplicate mobile/internet rule | Accepted: one active claim/type/person/month | Resolved 2026-11-09; marker release still TBD |
| Travel allowance | Accepted: multiple claims/month | Resolved 2026-11-09 |
| Claims self-approval | **Disabled for all roles in v1** | Security-approved ADR to change |
| Request approval | Single step v1 | Confirm future multi-step |
| Project membership | Employee requests; Super Admin assigns by default, Admin only with explicit grant | Resolved 2026-11-09 |
| Admin default scope | Employee and own read; directional Super Admin grant for another Admin (ADR-0007); management/review/approval stays separately granted | Revised 2026-11-24 |
| Audit retention | TBD per policy and local legal requirements | Yes |
| File allowed MIME/size | PDF/DOCX/JPG/PNG, 5 MB (5,000,000 bytes) per file | Resolved 2026-11-09 |
| Receipt malware handling | Quarantine + validation; scanning design TBD | Yes |
| Session duration | Hosted identity-provider security policy TBD | Yes |
| Cognito password policy | Minimum 12 characters with uppercase, lowercase, number and special character; administrator temporary password valid 7 days | Resolved 2026-11-10 |
| Privileged MFA | Deferred for v1; password login with controls in ADR-0003 | Resolved 2026-11-09 |
| Email delivery | No delivery integration; Cognito messages suppressed and Super Admin hands off a one-time credential privately | Resolved 2026-11-20 (ADR-0006) |
| Dashboard period | Default last 30 days, max 12 months | Confirm |
| Public route and TLS | Existing `https://registration.pac-d.com/workpilot/` through host Nginx/Certbot; no CloudFront or distribution | Resolved 2026-11-21 |
| Employee identifier format | `emp-001` username example; actual format TBD | Yes |
| Admin may amend others' submitted claims | Deny by default; explicit scoped permission/mandatory reason | Yes |
| Financial mark-paid role | Explicit Super Admin grant only | Yes |
| Hosted event adapter and dynamic scope authorization | Single-instance SSE with per-event database authorization approved in ADR-0007; multi-instance durable replay/broker remains TBD | Resolved for current Lightsail topology |
| Event delivery operational SLO | Best effort, 5-second target | Confirm |
| Project join-request states/schema | Route exists, persistence and exact transitions not yet contracted | Yes before module implementation |

No agent should silently resolve these as implemented features. Defaults are provisional **only where explicitly indicated**.

## Follow-up decisions after ADR-0007

- Task attachment policy remains open. Claims and requests now accept private PDF/image attachments; task files need an explicit lifecycle and review policy before implementation.
- Task and assignment project selectors search by project-name prefix within a bounded page. A full browsable project chooser remains optional if users need a different discovery pattern.
