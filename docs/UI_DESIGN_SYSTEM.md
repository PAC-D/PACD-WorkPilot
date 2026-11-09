# UI design system, strict tokens and interaction rules

## Visual direction
Professional, compact, minimalist. Navy shades for primary navigation/CTAs, black/white and off-white backgrounds, one restrained gradient max per major view. No emoji, decorative hashtags, em dash punctuation, repeated labels, rainbow analytics cards, huge shadows or excessive motion. High information density without cramped forms. Mobile-first claim upload.

## Color tokens (locked v1)
| Token | Hex | Usage |
|---|---|---|
| `--navy-950` | `#071A33` | Sidebar/background dark |
| `--navy-900` | `#0B2347` | Primary text on pale bg/nav |
| `--navy-800` | `#12345C` | Brand/action hover |
| `--navy-700` | `#1B4877` | Main primary actions |
| `--navy-500` | `#4071A4` | Secondary chart series |
| `--navy-100` | `#E8F0F8` | Selected surfaces |
| `--white` | `#FFFFFF` | Cards/surfaces |
| `--canvas` | `#F7F9FC` | Page background |
| `--ink` | `#141922` | Body text |
| `--muted` | `#64748B` | Secondary text |
| `--border` | `#E1E7EF` | Quiet separators |
| `--success` | `#207653` | Approved, accessible text |
| `--warning` | `#9C5C0B` | Needs info/blocked |
| `--danger` | `#B42333` | Rejected/errors |

Gradient allowed sparingly: `linear-gradient(120deg,#071A33,#1B4877)` on sign-in header or single dashboard welcome/banner, not every card. Charts: navy sequence + neutral grays, accessibility contrast and non-color labels. Dark mode **not required v1**; dark sidebar permitted, primary content light.

## Sizing and typography
Font: Inter, with system-ui fallback (self-host only if licensed/required; otherwise system-ui). Base 14px with readable line-height; main headings 20–24px, section headings 16–18px, labels 13–14px. Spacing 4/8px system. Radius 8–12px. Sidebar width 224px; compact icon-only collapse optional. Control height >=40px, mobile >=44px target. Minimal motion 120–180ms and respect `prefers-reduced-motion`.

## Shared UI contracts
`AppShell`, `Sidebar`, `PageHeader`, `DataTable`, `Pagination`, `FilterBar`, `SearchField`, `MonthPicker`, `DatePicker`, `FileUpload`, `FormField`, `FormRenderer`, `ConfirmDialog`, `Toast`, `StatusBadge`, `ChartCard`, `EmptyState`, `Skeleton`, `PermissionGate`. Import from `packages/ui` or approved shared directory, never rewrite local clones. `PermissionGate` is visual only; backend remains authoritative.

## Navigation
User: Overview, My Work, Projects, Claims, Requests, Profile. Admin: Overview, People, Projects, Work, Claims, Requests, Reports. Super Admin additionally: Users & Access, Configuration, Audit. Hide inaccessible areas; direct URL should still receive 403/404.

## Admin dashboard mandatory widgets
- 4 compact stat cards: Pending Claims, Pending Requests, Active Projects, Blocked Work.
- Line/bar chart: work updates per day/week with filter and downloadable tabular equivalent.
- Pie/donut chart: project status or request type composition, accessible legend + amounts.
- Project timeline table: project, assigned date/start date, planned end, actual end, owner, assigned members, status. Show missing date as `Not set`, never fake dates.
- Recent activity and approvals queue. Charts and table share date/project filters and authorized scope.
- On screen updates via AppSync event invalidation, no timed fetching. Explicit connection state icon + refresh button.

## Workflow and language
Prefer action labels: `Update work`, `Submit claim`, `Request software`, `Approve`, `Return for changes`. Use short instructional copy; optional advanced fields collapsed. Never rely on tooltips for essential instructions. Status displayed as text and color. File upload progress and clear error. Explain rejected claims in plain language. No confirmation dialog for harmless navigation; confirm approval/rejection/role changes.

## Charts
Use Recharts wrappers to standardize axes, legend, empty states, tooltips, accessibility fallback table, formatting. Pie never conveys only color; show exact count/percent. Avoid more than 5–6 slices; group remainder into Other. All graphs use scoped, server-computed values (not raw unfiltered employee data).

## Accessibility
Keyboard-friendly tabs/modals/forms, visible focus, proper input labels, meaningful error messages, contrast targets WCAG 2.2 AA, non-color status, reduced-motion support. Chart summary and data table are mandatory for users unable to interpret visual marks.
