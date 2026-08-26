/**
 * Mirrors `rules-query.ts`'s `RulesClient` seam for Poracle: a default
 * tRPC-backed client, overridable for tests, and a hook that owns the
 * request lifecycle so a component never talks to `/api/trpc` itself. See
 * that file's module comment for why the transport is the untyped tRPC
 * client rather than `createTRPCClient<AppRouter>()`.
 *
 * `useAlerts` runs `status` first and only fetches `snapshot` once that
 * comes back `present` -- an `absent` or `unreachable` human has no
 * subscriptions to read, and fetching anyway would be a request whose
 * answer is already known. This is also why the two live behind separate
 * queries rather than one: `status` alone is enough to decide whether the
 * tab (`alerts-page.tsx`) and the nav entry (`bottom-nav.tsx`) render at
 * all, without ever asking Poracle for a snapshot neither will use.
 */

import { useQuery } from '@tanstack/react-query'
import { createTRPCUntypedClient, httpBatchLink } from '@trpc/client'
import type { AnyRouter } from '@trpc/server'
import type { AlertRow } from '../rules/poracle-vocabulary'

/** The four answers `alerts.status` can give -- see `alerts-router.ts`. */
export type AlertsState = 'present' | 'absent' | 'unreachable' | 'unconfigured'

/**
 * The client's view of `server/src/services/poracle-view.ts`'s
 * `AlertsSnapshot` -- a mirror, not an import, for the same reason
 * `AlertRow` in `poracle-vocabulary.ts` is one: `tsconfig.app.json` only
 * includes `app/**`.
 */
export interface HumanView {
  enabled: boolean
  currentProfileNo: number
  latitude: number | null
  longitude: number | null
  areas: string[]
}

export interface ProfileView {
  profileNo: number
  name: string
}

export interface LocationView {
  label: string
  latitude: number
  longitude: number
}

export interface AlertsSnapshot {
  human: HumanView
  alerts: AlertRow[]
  profiles: ProfileView[]
  locations: LocationView[]
}

/** The two `alerts.*` procedures the tab needs. */
export interface AlertsClient {
  status(): Promise<{ state: AlertsState }>
  snapshot(): Promise<AlertsSnapshot>
}

function createDefaultAlertsClient(): AlertsClient {
  const client = createTRPCUntypedClient<AnyRouter>({
    links: [httpBatchLink({ url: '/api/trpc' })],
  })
  return {
    status: () =>
      client.query('alerts.status') as Promise<{ state: AlertsState }>,
    snapshot: () => client.query('alerts.snapshot') as Promise<AlertsSnapshot>,
  }
}

// Constructed once and reused across every `useAlerts` call that does not
// supply its own client -- one link chain, not one per mount.
let defaultClient: AlertsClient | null = null
function getDefaultClient(): AlertsClient {
  if (!defaultClient) defaultClient = createDefaultAlertsClient()
  return defaultClient
}

export function alertsStatusQueryKey() {
  return ['alerts', 'status'] as const
}

export function alertsSnapshotQueryKey() {
  return ['alerts', 'snapshot'] as const
}

export interface UseAlertsOptions {
  client?: AlertsClient
}

export interface UseAlertsResult {
  state: 'loading' | AlertsState
  snapshot: AlertsSnapshot | null
}

export function useAlerts({
  client = getDefaultClient(),
}: UseAlertsOptions = {}): UseAlertsResult {
  const statusQuery = useQuery({
    queryKey: alertsStatusQueryKey(),
    queryFn: () => client.status(),
  })

  const state = statusQuery.data?.state

  const snapshotQuery = useQuery({
    queryKey: alertsSnapshotQueryKey(),
    queryFn: () => client.snapshot(),
    // Only `present` has anything to read -- see the module comment.
    enabled: state === 'present',
  })

  // A rejected `status()` -- `alerts.status` throws UNAUTHORIZED for a
  // signed-out visitor and FORBIDDEN for a signed-in one the operator's
  // Discord role gating excludes, both ordinary outcomes `requirePerm`
  // produces on every route `BottomNav` mounts on -- fails closed to
  // `absent` rather than staying pinned to `loading`. An error means this
  // account's access to Alerts could not be established, which is exactly
  // the case `absent` already exists to hide the tab for; the alternative
  // (`loading` forever) leaves the nav entry and a blank page up
  // indefinitely for precisely the population `absent` is for.
  const resolvedState: AlertsState | 'loading' = statusQuery.isError
    ? 'absent'
    : (state ?? 'loading')

  return {
    state: statusQuery.isLoading ? 'loading' : resolvedState,
    snapshot: state === 'present' ? (snapshotQuery.data ?? null) : null,
  }
}
