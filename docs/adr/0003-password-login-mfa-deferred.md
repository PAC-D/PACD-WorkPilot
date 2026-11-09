# ADR-0003: Password login with MFA deferred

**Status:** Accepted by product owner | **Date:** 2026-11-09

## Decision
Use the existing invite-only Amazon Cognito username/password design and build a custom PACD WorkPilot login screen. MFA is not required for v1. Public registration and a custom password database remain prohibited. The authentication adapter must preserve Cognito challenge support so MFA can be enabled later without changing domain services.

## Security consequences
A login page is presentation and does not provide the additional protection of MFA. Deferring MFA increases the impact of password theft. V1 therefore requires Cognito throttling and password policy, secure account recovery, short-lived tokens appropriate to operations, session revocation, sanitized authentication logging and monitoring for repeated failures. Privileged MFA should be reconsidered before production security signoff.

## Alternatives considered
Mandatory privileged MFA provides stronger protection but was declined for the initial release. A custom password store was rejected because it expands security and operational risk and violates the approved identity architecture.
