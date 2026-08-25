/**
 * Rules are RPC and land in TanStack Query; entities are deltas and land
 * in the Zustand entity store (`app/map/entity-store.ts`). Nothing
 * crosses -- see the design spec's "Client state" section.
 *
 * The default transport is `@trpc/client`'s untyped client rather than
 * `createTRPCClient<AppRouter>()`: `tsconfig.app.json` only includes
 * `app/**`, and task 8's report already worked out why a shared module
 * straddling that boundary is the wrong fix. `RulesClient` is the seam --
 * a real instance talks to `/api/trpc`, a test supplies a fake one, and
 * `useRules` itself never knows which.
 */

import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { createTRPCUntypedClient, httpBatchLink } from '@trpc/client'
import type { AnyRouter } from '@trpc/server'
import { useMemo } from 'react'
import type { Rule } from './rule-types'

/**
 * The `rules.update` patch: every rule column but `id` and `speciesId`.
 * Species membership is not something an update patch changes -- see
 * `server/src/trpc/rules-router.ts`'s `updateInput`, which this mirrors.
 */
export type RulePatch = Partial<Omit<Rule, 'id' | 'speciesId'>>

/** The two `rules.*` procedures this hook needs. */
export interface RulesClient {
  list(): Promise<Rule[]>
  update(ruleIds: number[], patch: RulePatch): Promise<void>
}

function createDefaultRulesClient(): RulesClient {
  const client = createTRPCUntypedClient<AnyRouter>({
    links: [httpBatchLink({ url: '/api/trpc' })],
  })
  return {
    list: () => client.query('rules.list') as Promise<Rule[]>,
    update: async (ruleIds, patch) => {
      await client.mutation('rules.update', { ruleIds, patch })
    },
  }
}

// Constructed once and reused across every `useRules` call that does not
// supply its own client -- one link chain, not one per mount.
let defaultClient: RulesClient | null = null
function getDefaultClient(): RulesClient {
  if (!defaultClient) defaultClient = createDefaultRulesClient()
  return defaultClient
}

/**
 * The query key includes `profileId`, or the profile switcher plan (still
 * deferred) will serve the wrong list from cache once it lands. Every
 * account has exactly one profile today (`seedProfileForUser`), so the
 * value passed in is a stable placeholder rather than a fetched id -- see
 * `map-canvas.tsx`'s `CURRENT_PROFILE_ID`.
 */
export function rulesQueryKey(profileId: number) {
  return ['rules', profileId] as const
}

export interface UseRulesOptions {
  client?: RulesClient
}

export interface UseRulesResult {
  /** `id -> Rule`, the shape every resolver and grouping function reads. */
  rules: Map<number, Rule>
  isLoading: boolean
  isFetching: boolean
  error: unknown
  /**
   * Patches every rule named, which is how a card commits: a group is
   * several rows that differ only in their subject, so an edit to the
   * card is the same write to each of them. A caller that means to peel
   * ONE member off passes that member's id alone -- see
   * `split-warning.tsx` for why those are the only two possibilities.
   */
  update: (ruleIds: number[], patch: RulePatch) => Promise<void>
  refetch: () => void
}

export function useRules(
  profileId: number,
  { client = getDefaultClient() }: UseRulesOptions = {},
): UseRulesResult {
  const queryClient = useQueryClient()
  const queryKey = rulesQueryKey(profileId)

  const query = useQuery({
    queryKey,
    queryFn: () => client.list(),
  })

  const rules = useMemo(() => {
    const map = new Map<number, Rule>()
    for (const rule of query.data ?? []) map.set(rule.id, rule)
    return map
  }, [query.data])

  const mutation = useMutation({
    mutationFn: (vars: { ruleIds: number[]; patch: RulePatch }) =>
      client.update(vars.ruleIds, vars.patch),
    // Optimistic: the sheet and the map keep rendering against the edit
    // immediately rather than waiting on a round trip.
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Rule[]>(queryKey)
      queryClient.setQueryData<Rule[]>(queryKey, (current) =>
        (current ?? []).map((rule) =>
          vars.ruleIds.includes(rule.id) ? { ...rule, ...vars.patch } : rule,
        ),
      )
      return { previous }
    },
    // A failed mutation rolls back to the snapshot taken above rather
    // than leaving the optimistic (wrong) write in place. The map keeps
    // rendering against the rolled-back set -- see the design spec's
    // Errors section.
    onError: (_err, _vars, context) => {
      if (context?.previous)
        queryClient.setQueryData(queryKey, context.previous)
    },
  })

  return {
    rules,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    // `mutation.error` outlives the call that produced it (react-query
    // clears it only on the next `mutate`), which is exactly what lets a
    // caller render "that edit failed" after the fact.
    error: query.error ?? mutation.error ?? null,
    update: async (ruleIds, patch) => {
      try {
        await mutation.mutateAsync({ ruleIds, patch })
      } catch {
        // Rolled back in `onError` above; surfaced through `error`. A
        // caller that wants to react to the failure reads that field
        // rather than catching this promise.
      }
    },
    refetch: () => {
      query.refetch()
    },
  }
}

/**
 * Rebuilds the shared `QueryClient` every `useRules` call attaches to
 * through the ambient `QueryClientProvider` (see `app.tsx`). Exists so
 * that provider and this module agree on defaults without either
 * importing the other's instance.
 */
export function createRulesQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      // No automatic retries: a failed fetch or mutation should surface
      // through `error` on the tick it failed, not disappear into a
      // silent background retry. Rules change on an edit or on the
      // staleness check above, never on a timer, so there is no
      // background-refetch case this would help either.
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

export interface ApplyDeltaWithRulesArgs {
  /** The rule ids one delta's entities carried, deduplicated or not -- either is fine. */
  matched: number[]
  /** The envelope's `rulesVersion`, when the subscription is rules-driven. */
  rulesVersion?: number
  /** The version `rules` was fetched at. */
  fetchedAt?: number
  rules: Map<number, Rule>
  invalidate: () => void
}

/**
 * The design spec's "Staleness" section, as one function: two triggers,
 * one path.
 *
 * - A `matched` id the client does not hold means a rule was added
 *   elsewhere.
 * - A `rulesVersion` that differs from the one the rules were fetched
 *   with means a rule was edited elsewhere. The unknown-id check alone
 *   cannot see this, because an edit keeps its id.
 *
 * Both call `invalidate` exactly once, never twice for the same delta:
 * whoever wires this to the live socket wants one refetch per stale
 * signal, not one per condition that happened to be true.
 */
export function applyDeltaWithRules({
  matched,
  rulesVersion,
  fetchedAt,
  rules,
  invalidate,
}: ApplyDeltaWithRulesArgs): void {
  const hasUnknownId = matched.some((id) => !rules.has(id))
  const versionMoved =
    rulesVersion !== undefined &&
    fetchedAt !== undefined &&
    rulesVersion !== fetchedAt
  if (hasUnknownId || versionMoved) invalidate()
}
