# Data fetching, caching and event-driven updates

## Contract: NO timer polling
- React Query `refetchInterval: false` globally and per-query. No `setInterval`, SWR refresh timers, `window.location.reload()` for data sync, or backend scheduled dashboard reads.
- On initial view: query API once. On any successful local mutation: set returned entity in detail cache and invalidate exactly affected list/summary keys. On **remote committed mutation**: receive authorized event, invalidate affected query keys. Only mounted/active queries refetch automatically; inactive caches become stale and load when visited.
- On reconnect/focus after interruption: reconcile relevant active queries **once**. This is event-driven recovery, not an interval. Debounce burst event invalidations 150–300ms; no cross-employee shared state cache.
- Real-time transport is an authorized provider adapter. Local development may use an in-process adapter; AppSync Events is an AWS candidate only. Clients subscribe to scoped channels based on server-authorized grants, but client-provided channel names are never sufficient authorization. Never expose a public subscription to private records.

## Channel design
`/org/<orgId>/admins/claims`, `/org/<orgId>/admins/activities`, `/org/<orgId>/admins/requests`, `/org/<orgId>/projects/<projectId>`, `/org/<orgId>/users/<sub>`. Channel authorization must verify user identity plus current grants; on revocation disconnect/re-subscribe and reject old channel entitlement. If a hosted transport cannot enforce dynamic authorization directly, implement an authorized subscription broker or narrower identity-specific fanout and document an ADR **before launch**. Never rely on guessed channel paths.

## Event lifecycle
1. Request validates and writes entity + audit + event marker transactionally.
2. A durable publisher reads committed PostgreSQL outbox rows and publishes after commit; local development may use an in-process adapter.
3. Publisher validates event marker, publishes non-sensitive event to authorized channels; retries are deduped and version checked.
4. Viewer receives event; query-key map invalidates `claims.list`, `claims.detail:id`, `dashboard.summary` for matching claim event, etc.
5. Active queries refetch from API and server rechecks access. No event payload used to update financial values.
6. If event lost/out of order or socket disconnected, visibility/reconnect performs one-time reconciliation; user can click Refresh manually.

## TanStack Query policy
- Reference data (project/category list): `staleTime` 10 minutes **for read reuse only**; relevant config events immediately invalidate. No interval.
- Work/claims/requests: `staleTime` 60 seconds for incidental navigation, but event/mutation invalidates immediately. `refetchOnWindowFocus` custom one-time focus reconciliation; avoid redundant re-fetch on every tiny focus switch.
- Dashboard summary: `staleTime` 60 seconds, invalidate on scoped events; charts are not independently polling.
- Cache keys include `currentPrincipalId`, `policyVersion`, scope, filters, cursor and date range. On signout, role changes or permissions updated, **clear cache and reconnect subscriptions**.
- Avoid caching presigned URLs longer than their expiry; never persist private API cache to localStorage or shared service-worker storage.
- Mutations return definitive server state; show pending UI until confirmed; error rollbacks.

## Query and UI examples
`useQuery({queryKey: queryKeys.claims.list({viewer,month,status,cursor}),queryFn,refetchInterval:false})`. On claim event, invalidate matching scope list, affected claim detail and dashboard summary. In tables retain previous-page data during page transitions, but show loading state and no stale approval controls.

## Failure modes
- Event transport outage: UI indicates **Live updates disconnected**, manual refresh remains available, reconnect reconciliation restores state; core CRUD works.
- Long idle tab/browser suspension: reconnect/focus sync once.
- Duplicate event: version comparison and invalidation batching.
- Missing event: reconnect/focus/manual refresh, plus server revision checks when opening detailed records.
- No promise of instantaneous guaranteed live events; set operational alerts for failures.

## Security caveat
Even invalidation-only events can leak existence or activity timing. Channel-level authorization and scope filtering are mandatory. A revoked Admin must not continue receiving private scope events.
