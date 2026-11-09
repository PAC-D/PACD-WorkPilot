# Changelog

## 2026-11-09 - Frontend foundation with role dashboards
- Bootstrapped the pnpm workspace with strict TypeScript, React, Vite, Tailwind CSS, TanStack Query, Zod, Lucide, and Recharts.
- Added shared contract schemas for the three roles, the documented permission catalog, and existing workflow statuses.
- Added shared UI primitives and responsive USER, ADMIN, and SUPER_ADMIN dashboard previews with typed fictional data.
- Added permission-driven navigation, scoped Admin behavior, self-approval messaging, accessible chart tables, responsive navigation, and CSS-controlled paper texture using locked color tokens.
- Added role and permission tests, no-polling query defaults, and production build scripts.
- Documented every demo-data seam and required backend replacement in `docs/FRONTEND_BACKEND_HANDOFF.md`.
- No backend endpoint, permission, database model, event schema, migration, or AWS resource changed.

## 2026-11-09 - Documentation baseline v1.0
- Locked product modules and three-role permission model.
- Documented AWS cost-conscious event-driven stack and strict no-polling rule.
- Created UX tokens, data model, API contract, security policy, and testing criteria.
- No executable application code included.
