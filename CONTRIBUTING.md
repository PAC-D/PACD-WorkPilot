# Contributing and change control

1. Read `AGENTS.md` and the relevant `docs/` specifications before writing code.
2. Open issue with expected user behavior and acceptance criteria.
3. For new services, schema access patterns, permission changes, event routing or UI token changes, write an ADR **before** implementation.
4. Update contract + negative security tests in the same PR. No undocumented endpoints or permissions.
5. Document data migration/rollback for destructive changes. Do not store user passwords or private receipt files in fixtures.
6. Include screenshots of UI and keyboard/mobile checks for interface PRs.
7. Require product owner approval for open decisions and security changes.
