# Explicit open decisions (do not invent answers)

All changes require product-owner decision and, when technical choices change, an ADR.

| Decision | Working default | Owner acceptance required |
|---|---|---|
| AWS region | TBD, example `us-east-1` not final | Yes |
| Organization timezone | `Asia/Dhaka` | Confirm |
| Claim type limits/caps | Accepted: no auto-payment; optional policy caps initially unset | Resolved 2026-11-09 |
| Duplicate mobile/internet rule | Accepted: one active claim/type/person/month | Resolved 2026-11-09; marker release still TBD |
| Travel allowance | Accepted: multiple claims/month | Resolved 2026-11-09 |
| Claims self-approval | **Disabled for all roles in v1** | Security-approved ADR to change |
| Request approval | Single step v1 | Confirm future multi-step |
| Project membership | Employee requests; Super Admin assigns by default, Admin only with explicit grant | Resolved 2026-11-09 |
| Admin default scope | Organization-wide read; management/review/approval stays explicitly granted | Resolved 2026-11-09 |
| Audit retention | TBD per policy and local legal requirements | Yes |
| File allowed MIME/size | PDF/DOCX/JPG/PNG, 5 MB (5,000,000 bytes) per file | Resolved 2026-11-09 |
| Receipt malware handling | Quarantine + validation; scanning design TBD | Yes |
| Session duration | Cognito security policy TBD | Yes |
| Privileged MFA | Deferred for v1; password login with controls in ADR-0003 | Resolved 2026-11-09 |
| Email delivery | Cognito invitations; custom notification email deferred | Yes |
| Dashboard period | Default last 30 days, max 12 months | Confirm |
| CloudFront/custom domain | TBD | Yes |
| Employee identifier format | `emp-001` username example; actual format TBD | Yes |
| Admin may amend others' submitted claims | Deny by default; explicit scoped permission/mandatory reason | Yes |
| Financial mark-paid role | Explicit Super Admin grant only | Yes |
| AppSync dynamic scope auth implementation | Security proof needed in staging, otherwise scoped broker design ADR | Yes |
| Event delivery operational SLO | Best effort, 5-second target | Confirm |

No agent should silently resolve these as implemented features. Defaults are provisional **only where explicitly indicated**.
