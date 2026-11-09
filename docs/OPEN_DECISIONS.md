# Explicit open decisions (do not invent answers)

All changes require product-owner decision and, when technical choices change, an ADR.

| Decision | Working default | Owner acceptance required |
|---|---|---|
| AWS region | TBD, example `us-east-1` not final | Yes |
| Organization timezone | `Asia/Dhaka` | Confirm |
| Claim type limits/caps | No auto-payment, optional policy caps | Yes |
| Duplicate mobile/internet rule | One active claim/type/person/month | Yes |
| Travel allowance | Multiple claims/month | Yes |
| Claims self-approval | **Disabled for all roles in v1** | Security-approved ADR to change |
| Request approval | Single step v1 | Confirm future multi-step |
| Project membership | Employee requests, Admin/Super Admin approves | Yes |
| Admin default scope | Assigned departments/projects only | Yes |
| Audit retention | TBD per policy and local legal requirements | Yes |
| File allowed MIME/size | PDF/JPG/PNG, 10 MB per file proposed | Yes |
| Receipt malware handling | Quarantine + validation; scanning design TBD | Yes |
| Session duration | Cognito security policy TBD | Yes |
| Privileged MFA | Mandatory, confirm tier/features | Yes |
| Email delivery | Cognito invitations; custom notification email deferred | Yes |
| Dashboard period | Default last 30 days, max 12 months | Confirm |
| CloudFront/custom domain | TBD | Yes |
| Employee identifier format | `emp-001` username example; actual format TBD | Yes |
| Admin may amend others' submitted claims | Deny by default; explicit scoped permission/mandatory reason | Yes |
| Financial mark-paid role | Explicit Super Admin grant only | Yes |
| AppSync dynamic scope auth implementation | Security proof needed in staging, otherwise scoped broker design ADR | Yes |
| Event delivery operational SLO | Best effort, 5-second target | Confirm |

No agent should silently resolve these as implemented features. Defaults are provisional **only where explicitly indicated**.
