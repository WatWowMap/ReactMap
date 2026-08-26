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
 * `server/src/trpc/alerts-router.ts`'s `alertInput` accepts -- `alertRuleShape`
 * plus `profileNo`, which rides along on `AlertPatch` since `AlertRow` already
 * carries it -- `pokemonId` required and everything else optional. The same
 * shape a client reads an `AlertRow` back as, minus the three fields that are
 * Poracle's to set (`uid`, `ping`) or read-only (`description`).
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

/**
 * The write procedures `alerts-router.ts` added for the human panel, plus
 * the five above and the two reads.
 *
 * `addProfile` answers `{ added: true }` rather than a profile number --
 * Poracle assigns one server-side and never returns it, and guessing by
 * re-listing profiles before and after is a race dressed up as data. See the
 * router's own comment on that procedure.
 */
export interface AlertsClient {
  status(): Promise<{ state: AlertsState }>
  snapshot(): Promise<AlertsSnapshot>
  create(rule: AlertWriteInput): Promise<AlertCreateResult>
  replace(args: {
    uid: number
    rule: AlertWriteInput
  }): Promise<{ uid: number }>
  remove(args: { uid: number }): Promise<{ deleted: number[] }>
  setEnabled(args: { enabled: boolean }): Promise<{ enabled: boolean }>
  switchProfile(args: {
    profileNo: number
  }): Promise<{ currentProfileNo: number }>
  addProfile(args: { name: string }): Promise<{ added: true }>
  deleteProfile(args: { profileNo: number }): Promise<{ deleted: number }>
  copyProfileRules(args: {
    fromProfileNo: number
    toProfileNo: number
  }): Promise<{ toProfileNo: number }>
  /**
   * Replaces the whole selected-areas list. Echoes what was *sent*, after
   * `alerts-router.ts`'s own `areasToSkip` filter -- never a report of what
   * Poracle actually *kept* (its own response here is `{status: "ok"}`).
   * `useAlerts.setAreas` does not trust this return value for that reason;
   * it refetches instead. See `alerts-router.ts`'s own comment on `setAreas`.
   */
  setAreas(args: { areas: string[] }): Promise<{ areas: string[] }>
  /**
   * The areas this human may actually pick, already community-filtered by
   * Poracle and further cut by `areasToSkip` -- what a picker is built from
   * so it cannot offer a name `setAreas` would silently drop.
   */
  availableAreas(): Promise<{ areas: string[] }>
  addLocation(args: {
    label: string
    latitude: number
    longitude: number
  }): Promise<LocationView>
  updateLocation(args: {
    label: string
    latitude: number
    longitude: number
  }): Promise<LocationView>
  /** Refused (see `alerts-router.ts`'s `deleteLocation`) when a rule's
   *  `overrideLocationLabel` still names this location. */
  deleteLocation(args: { label: string }): Promise<{ deleted: string }>
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
    setEnabled: (args) =>
      client.mutation('alerts.setEnabled', args) as Promise<{
        enabled: boolean
      }>,
    switchProfile: (args) =>
      client.mutation('alerts.switchProfile', args) as Promise<{
        currentProfileNo: number
      }>,
    addProfile: (args) =>
      client.mutation('alerts.addProfile', args) as Promise<{ added: true }>,
    deleteProfile: (args) =>
      client.mutation('alerts.deleteProfile', args) as Promise<{
        deleted: number
      }>,
    copyProfileRules: (args) =>
      client.mutation('alerts.copyProfileRules', args) as Promise<{
        toProfileNo: number
      }>,
    setAreas: (args) =>
      client.mutation('alerts.setAreas', args) as Promise<{
        areas: string[]
      }>,
    availableAreas: () =>
      client.query('alerts.availableAreas') as Promise<{ areas: string[] }>,
    addLocation: (args) =>
      client.mutation('alerts.addLocation', args) as Promise<LocationView>,
    updateLocation: (args) =>
      client.mutation('alerts.updateLocation', args) as Promise<LocationView>,
    deleteLocation: (args) =>
      client.mutation('alerts.deleteLocation', args) as Promise<{
        deleted: string
      }>,
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

export function alertsAvailableAreasQueryKey() {
  return ['alerts', 'availableAreas'] as const
}

export interface UseAlertsOptions {
  client?: AlertsClient
}

export interface UseAlertsResult {
  state: 'loading' | AlertsState
  snapshot: AlertsSnapshot | null
  /**
   * The most recent failure from `create`, `replace` or `remove` --
   * `mutation.error` outlives the call that produced it (react-query
   * clears it only on the next `mutate`), which is what lets a caller
   * keep showing "that write failed" after the failed promise has
   * already resolved. `null` once nothing has failed, or once react-query
   * has cleared it for a fresh attempt. Modelled on `useRules`'s own
   * `error` (`rules-query.ts`) -- the write methods below still swallow
   * the promise, exactly like `useRules`'s do, but that swallow is only
   * safe when the error stays reachable through this field; that was the
   * piece missing before.
   */
  error: unknown
  /**
   * This human's selectable areas -- community-filtered by Poracle and cut
   * by the operator's `areasToSkip`, the same as `snapshot`'s own
   * `human.areas`. What the areas picker is built from, so it cannot offer
   * a name `setAreas` would silently drop. `[]` while loading or absent,
   * the same as `snapshot`.
   */
  availableAreas: string[]
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
  /** Flips the master switch. The response names the flag it just set, so the
   *  cache is patched directly rather than refetched. */
  setEnabled: (enabled: boolean) => Promise<void>
  /**
   * Makes a profile active. Poracle's `all_profiles=true` read already lists
   * every rule regardless of which profile is active, so nothing about the
   * rule list itself goes stale here -- what a refetch is for is
   * `human.currentProfileNo` and the rest of the human/profile picture the
   * panel renders, which the mutation's own response does not carry.
   */
  switchProfile: (profileNo: number) => Promise<void>
  /** Creates a profile. Poracle assigns its number and never returns it, so
   *  this refetches rather than guessing one -- same reasoning as `create`. */
  addProfile: (name: string) => Promise<void>
  /** Deletes a profile and its tracking rules. Poracle may reassign the
   *  active profile as a side effect, which only a refetch can reveal. */
  deleteProfile: (profileNo: number) => Promise<void>
  /** Overwrites `toProfileNo`'s tracking rules with a copy of
   *  `fromProfileNo`'s. The rules that changed are not named in the
   *  response, so this refetches rather than guessing their new shape. */
  copyProfileRules: (
    fromProfileNo: number,
    toProfileNo: number,
  ) => Promise<void>
  /**
   * Replaces the whole selected-areas list -- what a `distance = 0` rule
   * actually fires against. Poracle's own response here names nothing
   * (`{status: "ok"}`); the router echoes what was sent, which is not the
   * same claim as what was kept, so this refetches the snapshot rather than
   * trusting that echo -- the same answer `create` reaches for, for the
   * same reason.
   */
  setAreas: (areas: string[]) => Promise<void>
  /** Creates a saved location, and adds it to the cache from the response --
   *  Poracle's own answer names nothing beyond `{status: "ok"}`, so the
   *  router echoes what was sent and this trusts that echo the same way
   *  `setEnabled` trusts its own. */
  addLocation: (
    label: string,
    latitude: number,
    longitude: number,
  ) => Promise<void>
  /** Overwrites a saved location's coordinates, and patches the cache from
   *  the response the same way `addLocation` does. */
  updateLocation: (
    label: string,
    latitude: number,
    longitude: number,
  ) => Promise<void>
  /** Deletes a saved location. Refused server-side when a rule's
   *  `overrideLocationLabel` still names it -- see `alerts-router.ts`'s
   *  `deleteLocation` -- so a rejection here is not a bug to route around,
   *  it is the point: `error` carries why, the same as every other write. */
  deleteLocation: (label: string) => Promise<void>
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

  // Same gating as `snapshotQuery`: nothing to pick from until a human
  // exists to ask Poracle on behalf of.
  const availableAreasQuery = useQuery({
    queryKey: alertsAvailableAreasQueryKey(),
    queryFn: () => client.availableAreas(),
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

  const setEnabledMutation = useMutation({
    mutationFn: (vars: { enabled: boolean }) => client.setEnabled(vars),
    onSuccess: (result) => {
      queryClient.setQueryData<AlertsSnapshot>(
        alertsSnapshotQueryKey(),
        (current) =>
          current && {
            ...current,
            human: { ...current.human, enabled: result.enabled },
          },
      )
    },
  })

  const switchProfileMutation = useMutation({
    mutationFn: (vars: { profileNo: number }) => client.switchProfile(vars),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: alertsSnapshotQueryKey() }),
  })

  const addProfileMutation = useMutation({
    mutationFn: (vars: { name: string }) => client.addProfile(vars),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: alertsSnapshotQueryKey() }),
  })

  const deleteProfileMutation = useMutation({
    mutationFn: (vars: { profileNo: number }) => client.deleteProfile(vars),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: alertsSnapshotQueryKey() }),
  })

  const copyProfileRulesMutation = useMutation({
    mutationFn: (vars: { fromProfileNo: number; toProfileNo: number }) =>
      client.copyProfileRules(vars),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: alertsSnapshotQueryKey() }),
  })

  // Poracle's own `POST /areas` answers `{status: "ok"}` and names nothing.
  // `alerts-router.ts`'s `setAreas` echoes back what was *sent*, not a
  // report of what was *kept* -- Poracle's own intersection against this
  // human's allowed set can still drop an entry the router's own filter let
  // through. Patching the cache from that echo would show an area that was
  // never actually stored, and since `distance = 0` means "use my areas",
  // that is a rule's real scope silently diverging from what is on screen.
  // A refetch is the only honest answer -- the same one `create` already
  // reaches for, for the same reason (`AlertCreateResult`'s own comment).
  const setAreasMutation = useMutation({
    mutationFn: (vars: { areas: string[] }) => client.setAreas(vars),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: alertsSnapshotQueryKey() }),
  })

  const addLocationMutation = useMutation({
    mutationFn: (vars: {
      label: string
      latitude: number
      longitude: number
    }) => client.addLocation(vars),
    onSuccess: (result) => {
      queryClient.setQueryData<AlertsSnapshot>(
        alertsSnapshotQueryKey(),
        (current) =>
          current && { ...current, locations: [...current.locations, result] },
      )
    },
  })

  const updateLocationMutation = useMutation({
    mutationFn: (vars: {
      label: string
      latitude: number
      longitude: number
    }) => client.updateLocation(vars),
    onSuccess: (result) => {
      queryClient.setQueryData<AlertsSnapshot>(
        alertsSnapshotQueryKey(),
        (current) =>
          current && {
            ...current,
            locations: current.locations.map((location) =>
              location.label === result.label ? result : location,
            ),
          },
      )
    },
  })

  const deleteLocationMutation = useMutation({
    mutationFn: (vars: { label: string }) => client.deleteLocation(vars),
    onSuccess: (result) => {
      queryClient.setQueryData<AlertsSnapshot>(
        alertsSnapshotQueryKey(),
        (current) =>
          current && {
            ...current,
            locations: current.locations.filter(
              (location) => location.label !== result.deleted,
            ),
          },
      )
    },
  })

  return {
    state: statusQuery.isLoading ? 'loading' : resolvedState,
    snapshot: state === 'present' ? (snapshotQuery.data ?? null) : null,
    availableAreas:
      state === 'present' ? (availableAreasQuery.data?.areas ?? []) : [],
    error:
      createMutation.error ??
      replaceMutation.error ??
      removeMutation.error ??
      setEnabledMutation.error ??
      switchProfileMutation.error ??
      addProfileMutation.error ??
      deleteProfileMutation.error ??
      copyProfileRulesMutation.error ??
      setAreasMutation.error ??
      addLocationMutation.error ??
      updateLocationMutation.error ??
      deleteLocationMutation.error ??
      null,
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
    setEnabled: async (enabled) => {
      try {
        await setEnabledMutation.mutateAsync({ enabled })
      } catch {
        // The stored flag is untouched; nothing to roll back.
      }
    },
    switchProfile: async (profileNo) => {
      try {
        await switchProfileMutation.mutateAsync({ profileNo })
      } catch {
        // Nothing was switched; nothing to reconcile.
      }
    },
    addProfile: async (name) => {
      try {
        await addProfileMutation.mutateAsync({ name })
      } catch {
        // Nothing was created; nothing to reconcile.
      }
    },
    deleteProfile: async (profileNo) => {
      try {
        await deleteProfileMutation.mutateAsync({ profileNo })
      } catch {
        // The profile is untouched; nothing to roll back.
      }
    },
    copyProfileRules: async (fromProfileNo, toProfileNo) => {
      try {
        await copyProfileRulesMutation.mutateAsync({
          fromProfileNo,
          toProfileNo,
        })
      } catch {
        // Nothing was copied; nothing to reconcile.
      }
    },
    setAreas: async (areas) => {
      try {
        await setAreasMutation.mutateAsync({ areas })
      } catch {
        // The stored areas are untouched; nothing to roll back.
      }
    },
    addLocation: async (label, latitude, longitude) => {
      try {
        await addLocationMutation.mutateAsync({ label, latitude, longitude })
      } catch {
        // Nothing was created; nothing to reconcile.
      }
    },
    updateLocation: async (label, latitude, longitude) => {
      try {
        await updateLocationMutation.mutateAsync({
          label,
          latitude,
          longitude,
        })
      } catch {
        // The stored location is untouched; nothing to roll back.
      }
    },
    deleteLocation: async (label) => {
      try {
        await deleteLocationMutation.mutateAsync({ label })
      } catch {
        // The stored location is untouched; nothing to roll back -- this is
        // also the "in use" refusal's path, which is not a bug to swallow
        // quietly; `error` carries it to the banner.
      }
    },
  }
}
