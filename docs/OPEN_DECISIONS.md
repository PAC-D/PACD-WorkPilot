# Explicit open decisions (do not invent answers)

All changes require product-owner decision and, when technical choices change, an ADR.

| Decision | Working default | Owner acceptance required |
|---|---|---|
| AWS staging region | `eu-north-1` (Europe/Stockholm) | Resolved 2026-11-10 |
| Hosted runtime/provider | Local-first accepted; AWS-managed services versus VPS remains TBD | Yes before deployment |
| Hosted PostgreSQL | Portable PostgreSQL accepted; Aurora/RDS versus VPS remains TBD | Yes before deployment |
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
| Session duration | Hosted identity-provider security policy TBD | Yes |
| Cognito password policy | Minimum 12 characters with uppercase, lowercase, number and special character; administrator temporary password valid 7 days | Resolved 2026-11-10 |
| Privileged MFA | Deferred for v1; password login with controls in ADR-0003 | Resolved 2026-11-09 |
| Email delivery | Cognito emails the temporary-password invitation; custom sender/domain may remain default during testing | Resolved 2026-11-10 |
| Dashboard period | Default last 30 days, max 12 months | Confirm |
| CloudFront/custom domain | TBD | Yes |
| Employee identifier format | `emp-001` username example; actual format TBD | Yes |
| Admin may amend others' submitted claims | Deny by default; explicit scoped permission/mandatory reason | Yes |
| Financial mark-paid role | Explicit Super Admin grant only | Yes |
| Hosted event adapter and dynamic scope authorization | Provider and security proof TBD; scoped broker design may require ADR | Yes |
| Event delivery operational SLO | Best effort, 5-second target | Confirm |
| Project join-request states/schema | Route exists, persistence and exact transitions not yet contracted | Yes before module implementation |

No agent should silently resolve these as implemented features. Defaults are provisional **only where explicitly indicated**.
