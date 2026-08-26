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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createTRPCUntypedClient, httpBatchLink } from '@trpc/client'
import type { AnyRouter } from '@trpc/server'
import type { AlertPatch, AlertRow } from '../rules/poracle-vocabulary'

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

/**
 * One rule, as `alerts.create` and `alerts.replace` take it: every column
 * `server/src/trpc/alerts-router.ts`'s `alertRuleShape` accepts, `pokemonId`
 * required and everything else optional -- the same shape a client reads
 * an `AlertRow` back as, minus the three fields that are Poracle's to set
 * (`uid`, `ping`) or read-only (`description`).
 */
export type AlertWriteInput = AlertPatch & { pokemonId: number }

/**
 * `AlertRow` down to the columns a write can carry: drops `uid` (Poracle's
 * to assign), `ping` (server-side, ignored on the way in) and
 * `description` (read-only), the same three `alertInput` on the server
 * has no field for.
 */
function toWriteInput(row: AlertRow): AlertWriteInput {
  const { uid: _uid, ping: _ping, description: _description, ...rest } = row
  return rest
}

/**
 * What `alerts.create` answers: counts, not rows -- Poracle's diff-apply
 * cannot name the rule it just made (see the router's own comment on
 * `AlertWriteResult`). A created row's uid is only ever learned by
 * refetching the snapshot.
 */
export interface AlertCreateResult {
  created: number
  updated: number
  unchanged: number
}

/** The three `alerts.*` write procedures, plus the two reads. */
export interface AlertsClient {
  status(): Promise<{ state: AlertsState }>
  snapshot(): Promise<AlertsSnapshot>
  create(rule: AlertWriteInput): Promise<AlertCreateResult>
  replace(args: {
    uid: number
    rule: AlertWriteInput
  }): Promise<{ uid: number }>
  remove(args: { uid: number }): Promise<{ deleted: number[] }>
}

function createDefaultAlertsClient(): AlertsClient {
  const client = createTRPCUntypedClient<AnyRouter>({
    links: [httpBatchLink({ url: '/api/trpc' })],
  })
  return {
    status: () =>
      client.query('alerts.status') as Promise<{ state: AlertsState }>,
    snapshot: () => client.query('alerts.snapshot') as Promise<AlertsSnapshot>,
    create: (rule) =>
      client.mutation('alerts.create', {
        rules: [rule],
      }) as Promise<AlertCreateResult>,
    replace: (args) =>
      client.mutation('alerts.replace', args) as Promise<{ uid: number }>,
    remove: (args) =>
      client.mutation('alerts.remove', args) as Promise<{ deleted: number[] }>,
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
  /**
   * Writes a new alert. Never patches the cache with a guessed row --
   * Poracle's create cannot name what it made (`AlertCreateResult`), so
   * the only trustworthy picture of the new row is a fresh snapshot.
   */
  create: (rule: AlertWriteInput) => Promise<void>
  /**
   * Replaces one alert by uid, and reconciles the cache with the uid the
   * write returns rather than the one it sent -- PUT is delete plus
   * insert on Poracle's side, so the old uid names a row that no longer
   * exists the moment this resolves. `patch` is merged onto the stored
   * row before it goes out, because Poracle's PUT is a full replace: an
   * omitted field is not "leave alone", it is "reset to default"
   * (`carriedForward` in `alerts-router.ts` covers only what genuinely
   * cannot travel through this endpoint at all).
   */
  replace: (uid: number, patch: AlertPatch) => Promise<void>
  /** Deletes one alert by uid, and drops it from the cache by the uids the write actually deleted. */
  remove: (uid: number) => Promise<void>
}

export function useAlerts({
  client = getDefaultClient(),
}: UseAlertsOptions = {}): UseAlertsResult {
  const queryClient = useQueryClient()

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

  const createMutation = useMutation({
    mutationFn: (rule: AlertWriteInput) => client.create(rule),
    // No trustworthy uid to patch the cache with -- see the module
    // comment on `AlertCreateResult`. A refetch is the only honest way
    // to learn what the new row actually looks like.
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: alertsSnapshotQueryKey() }),
  })

  const replaceMutation = useMutation({
    mutationFn: (vars: { uid: number; rule: AlertWriteInput }) =>
      client.replace(vars),
    onSuccess: (result, vars) => {
      queryClient.setQueryData<AlertsSnapshot>(
        alertsSnapshotQueryKey(),
        (current) =>
          current && {
            ...current,
            alerts: current.alerts.map((row) =>
              row.uid === vars.uid
                ? { ...row, ...vars.rule, uid: result.uid }
                : row,
            ),
          },
      )
    },
  })

  const removeMutation = useMutation({
    mutationFn: (vars: { uid: number }) => client.remove(vars),
    onSuccess: (result) => {
      queryClient.setQueryData<AlertsSnapshot>(
        alertsSnapshotQueryKey(),
        (current) =>
          current && {
            ...current,
            alerts: current.alerts.filter(
              (row) => !result.deleted.includes(row.uid),
            ),
          },
      )
    },
  })

  return {
    state: statusQuery.isLoading ? 'loading' : resolvedState,
    snapshot: state === 'present' ? (snapshotQuery.data ?? null) : null,
    create: async (rule) => {
      try {
        await createMutation.mutateAsync(rule)
      } catch {
        // Nothing was written; nothing to reconcile.
      }
    },
    replace: async (uid, patch) => {
      const row = snapshotQuery.data?.alerts.find((alert) => alert.uid === uid)
      if (!row) return
      try {
        await replaceMutation.mutateAsync({
          uid,
          rule: toWriteInput({ ...row, ...patch }),
        })
      } catch {
        // The stored row is untouched; nothing to roll back.
      }
    },
    remove: async (uid) => {
      try {
        await removeMutation.mutateAsync({ uid })
      } catch {
        // The stored row is untouched; nothing to roll back.
      }
    },
  }
}
