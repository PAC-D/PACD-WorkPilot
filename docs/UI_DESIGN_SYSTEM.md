# UI design system, strict tokens and interaction rules

## Visual direction
Professional, compact, minimalist. Deep navy anchors navigation, restrained mid-blue identifies actions, pale blue marks selected surfaces, white holds content, and a cool blue-gray canvas separates cards without visual noise. The PACD logo supplies the brighter cyan brand accent; do not repeat it across every control. Use one restrained gradient at most per major view. No promotional taglines, runtime/data-source disclosures, emoji, decorative hashtags, em dash punctuation, repeated labels, rainbow analytics cards, huge shadows or excessive motion. High information density without cramped forms. Mobile-first claim upload.

## Color tokens (locked v1)
| Token | Hex | Usage |
|---|---|---|
| `--navy-950` | `#071A33` | Sidebar/background dark |
| `--navy-900` | `#0B2347` | Strong headings |
| `--navy-800` | `#12345C` | Brand/action hover |
| `--navy-700` | `#1B4877` | Main primary actions |
| `--navy-500` | `#4071A4` | Focus, secondary actions and chart series |
| `--navy-100` | `#E8F0F8` | Selected surfaces and quiet accents |
| `--white` | `#FFFFFF` | Cards/surfaces |
| `--canvas` | `#F7F9FC` | Page background |
| `--ink` | `#172033` | Body text |
| `--muted` | `#64748B` | Secondary text |
| `--border` | `#E0E7EF` | Quiet separators |
| `--success` | `#207653` | Approved, accessible text |
| `--warning` | `#9C5C0B` | Needs info/blocked |
| `--danger` | `#B42333` | Rejected/errors |

The approved interface palette is the navy sequence `#071A33`, `#0B2347`, `#12345C`, `#1B4877`, `#4071A4`, and `#E8F0F8`, supported by white cards and cool neutral surfaces. The existing semantic success, warning, and danger colors remain available for legibility and status meaning. Gradient allowed sparingly: `linear-gradient(120deg,#071A33,#0B2347)` on the sign-in layout or a single dashboard banner, not every card. Charts use the navy sequence plus quiet blue-gray extensions with accessibility contrast and non-color labels. Dark mode **not required v1**; dark sidebar permitted, primary content light.

## Sizing and typography
Font is fixed globally to Inter with the existing system-ui fallback chain. Do not introduce module-specific font families. Base 14px with readable line-height; main headings 20–24px, section headings 16–18px, labels 13–14px. Spacing 4/8px system. Radius 8–12px. Sidebar width 224px; compact icon-only collapse optional. Control height >=40px, mobile >=44px target. Minimal motion 120–180ms and respect `prefers-reduced-motion`.

The implementation source of truth is `packages/ui/src/tokens.css`. Components use the shared `type-page-title`, `type-section-title`, `type-body`, `type-label`, `type-caption`, `type-metric`, and `type-overline` classes rather than defining module-specific font sizes or weights. The current scale is 12px caption, 13px label, 14px body, 16px section title, 24px page title, and 28px metric. Regular text uses weight 400, interactive labels use 500, and headings use at most 600.

Brand assets are served from the repository `assets/` directory. Use `logo_left.png` for the primary sidebar mark and `favicon.png` for the browser tab icon. Asset URLs must include Vite's deployment base path so they resolve beneath `/workpilot/` in production. Do not recreate or recolor these assets in module code.

The sign-in story uses the original, unfiltered `logo_left.png` on a light gradient plate so both its navy and cyan remain visible. Beneath the WorkPilot title, an open process line connects Projects, Work updates, Claims/Requests, and Review without a surrounding card or caption. A blue progress rail fills behind the opaque icons; each active icon lifts and turns cyan, then settles into a pale-blue completed state as the next step begins. After Review completes, the rail and all icons return to neutral together and hold a short reset pause before Projects starts again. It uses Lucide icons and CSS only, carries a concise accessible label, and becomes effectively static under `prefers-reduced-motion`.

On desktop, the story block and authentication group share the same vertical center. The right column has no separate background slab. Sign-in and password replacement use one restrained glass surface with a translucent navy-white gradient, subtle white border, 24px backdrop blur, translucent inputs, and cyan focus treatment. Mobile stacks the story and form without the desktop vertical offset.

The desktop workflow strip is offset slightly left so its first icon visually aligns with the WorkPilot title; the offset is removed on stacked mobile layouts. Desktop and mobile navigation use the same navy glass treatment as authentication: a translucent navy gradient, subtle highlight border, backdrop blur, soft depth, and glass selected states. The sidebar logo is smaller than the sign-in mark and has no individual plate. Its full-width header and the application topbar share the same translucent white surface, quiet border, blur, and shallow shadow. The topbar displays `WorkPilot` as one plain, large title without a logo, split styling, decoration, or animation.

The topbar notification control opens an accessible anchored panel and closes on outside press or Escape. Until a server notification contract is approved and implemented, it shows a neutral empty state without invented notifications, unread counts, badges, polling, or API calls.

Motion tokens are also centralized in `packages/ui/src/tokens.css`. Interface transitions use short 120–160ms timing and small entrance or hover offsets. The sign-in workflow is the sole ambient loop: a slow 8-second informational cycle. All motion must be disabled or reduced by the global `prefers-reduced-motion` rule.

## Shared UI contracts
`AppShell`, `Sidebar`, `PageHeader`, `DataTable`, `Pagination`, `FilterBar`, `SearchField`, `MonthPicker`, `DatePicker`, `FileUpload`, `FormField`, `FormRenderer`, `ConfirmDialog`, `Toast`, `StatusBadge`, `ChartCard`, `EmptyState`, `Skeleton`, `PermissionGate`. Import from `packages/ui` or approved shared directory, never rewrite local clones. `PermissionGate` is visual only; backend remains authoritative.

## Navigation
User: Overview, My Work, Projects, Claims, Requests, Profile. Admin: Overview, People, Projects, Work, Claims, Requests. Super Admin additionally: Users & Access, Configuration, Audit. Hide inaccessible areas; direct URL should still receive 403/404.

Canonical internal paths are `/dashboard`, `/work`, `/people`, `/projects`, `/claims`, `/requests`, `/admin`, `/settings`, `/admin/audit` and `/profile`. Production prefixes them with `/workpilot`, while local development has no prefix. Use real anchors plus History API interception so links remain accessible, browser Back/Forward works and users can open authorized areas in a new tab. Host Nginx plus the web container must provide SPA document fallback for deep-link refreshes under `/workpilot/`.

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
