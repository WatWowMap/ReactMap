// server/src/services/map-subscription.ts
//
// Task 5 of the transport plan: the per-connection poll loop that turns
// Task 4's pure `computeDelta` and `viewport-scanner.js` into a live,
// long-running async generator of delta batches for one (connection,
// category) pair -- pokemon or gym. No socket, no session, no tRPC here;
// this module is exercised directly by both the WS bridge
// (`server/src/ws/socket-server.js`) and the tRPC subscription procedure
// (`server/src/trpc/router.js`), which both wrap the SAME generator rather
// than each reimplementing the poll loop. See the Task 5 report for why two
// callers exist.
//
// Viewport changes update the subscription in place rather than opening a
// new one (`updateSubscription`), per the task brief. That reuses the same
// generator and its per-connection `previousMap` -- with one deliberate
// exception, documented on `subscribeCategory` below, for entities that
// leave the viewport.

import { computeDelta } from './delta-engine'
import type { createGolbatClient } from './golbat-client'
import { matchesFortFilters, matchesPokemonFilters } from './golbat-dnf-match'
import { scanFortsComplete, scanPokemonComplete } from './viewport-scanner'

type Category = 'pokemon' | 'gym'

interface Viewport {
  min: { lat: number; lon: number }
  max: { lat: number; lon: number }
}

interface SubscriptionState {
  category: Category
  viewport: Viewport
  filters: object[]
  generation: number
  // Set only while the loop is parked in `sleepOrWake`.
  wake: (() => void) | null
  // Set when a wake arrives while `wake` is null, i.e. while the loop is
  // anywhere other than its sleep. Consumed by the next `sleepOrWake`.
  wakePending: boolean
}

const POKEMON_POLL_INTERVAL_MS = 2_000
// Forts never expire and only change on a rare raid/quest/lure edit
// (transport spec, "Fort deltas come from Golbat's webhooks; only Pokémon
// poll fast"). This poll is gym reconciliation only in this task -- Task 6
// is what wires the webhook push that is supposed to carry the fast path --
// so it stays slow rather than hammering Golbat for something that changes
// on the order of minutes.
const GYM_POLL_INTERVAL_MS = 30_000

// Bounds the worst-case fan-out of one poll tick's subdivision (see
// viewport-scanner.js's `scanComplete`). The module's own default is 5
// (4^5 = 1024 leaf queries), sized for a one-off request; this poll loop
// runs continuously for as long as a connection is subscribed and a
// truncated response keeps recurring, so a shallower depth is the
// deliberately more conservative choice here. `complete: false` still comes
// out the far end whenever any leaf is still truncated at this depth, which
// is all rule 1 (limit_reached suppresses reconciliation) needs.
const MAX_SUBDIVISION_DEPTH = 2

function pollIntervalForCategory(category: Category): number {
  return category === 'gym' ? GYM_POLL_INTERVAL_MS : POKEMON_POLL_INTERVAL_MS
}

function createSubscriptionState({
  category,
  viewport,
  filters,
}: {
  category: Category
  viewport: Viewport
  filters?: object[]
}): SubscriptionState {
  return {
    category,
    viewport,
    filters: filters ?? [],
    generation: 0,
    wake: null,
    wakePending: false,
  }
}

/**
 * Updates viewport/filters in place and bumps `generation` -- the running
 * generator loop (`subscribeCategory`) reads these fresh on its next
 * iteration, and `wake()` (set only while the loop is sleeping between
 * polls) short-circuits that wait so a viewport move doesn't sit behind a
 * full poll interval.
 *
 */
function updateSubscription(
  state: SubscriptionState,
  { viewport, filters }: { viewport: Viewport; filters?: object[] },
) {
  state.viewport = viewport
  state.filters = filters ?? []
  state.generation += 1
  // `wake` is non-null only while the loop is actually asleep. The loop
  // spends most of its time elsewhere -- suspended on its `yield` until the
  // consumer asks for the next batch, and awaiting `pollOnce` -- so calling
  // `wake` when it happens to be set is not enough on its own. Record the
  // wake instead and let the next sleep consume it, or an update that lands
  // in either of those windows waits out a full poll interval: 2s for
  // pokemon, 30s for gyms.
  if (state.wake) state.wake()
  else state.wakePending = true
}

async function pollOnce(
  golbatClient: Pick<
    ReturnType<typeof createGolbatClient>,
    'scanPokemon' | 'scanForts'
  >,
  category: Category,
  viewport: Viewport,
  filters: object[],
): Promise<{ entities: any[]; complete: boolean }> {
  if (category === 'gym') {
    const { gyms, complete } = await scanFortsComplete(
      golbatClient,
      viewport,
      { gyms: { filters }, pokestops: null, stations: null },
      { maxDepth: MAX_SUBDIVISION_DEPTH },
    )
    return { entities: gyms, complete }
  }
  const { entities, complete } = await scanPokemonComplete(
    golbatClient,
    viewport,
    { filters },
    { maxDepth: MAX_SUBDIVISION_DEPTH },
  )
  return { entities, complete }
}

/**
 * Resolves after `ms`, or immediately once `state.wake()` is called, or
 * immediately if `signal` aborts. Only live while a poll tick is not
 * in-flight, so a viewport change mid-poll is picked up on the next loop
 * iteration rather than lost (see `subscribeCategory`).
 *
 */
function sleepOrWake(
  state: SubscriptionState,
  ms: number,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve) => {
    // Both of these are the same hazard: the loop is only listening for a
    // wake or an abort while it is parked here, and it spends most of its
    // life elsewhere. `addEventListener` on a signal that has ALREADY
    // aborted never fires, so without this check an abort raised while the
    // loop was awake would sleep out a full interval before the `while`
    // condition got to see it -- 30s of a leaked generator and timer per
    // gym disconnect.
    if (signal.aborted) {
      resolve(undefined)
      return
    }
    // A wake that arrived while the loop was awake is not lost, just
    // deferred to here.
    if (state.wakePending) {
      state.wakePending = false
      resolve(undefined)
      return
    }
    let done = false
    const finish = () => {
      if (done) return
      done = true
      clearTimeout(timer)
      state.wake = null
      signal.removeEventListener('abort', onAbort)
      resolve(undefined)
    }
    const timer = setTimeout(finish, ms)
    const onAbort = () => finish()
    state.wake = finish
    signal.addEventListener('abort', onAbort)
  })
}

/**
 * The long-running poll loop for one (connection, category) subscription.
 * Yields a delta batch on every tick, including the first (an empty
 * `{added: [], changed: [], removed: []}` is a real, meaningful message: it
 * is the subscribe acknowledgement -- "I heard you, here is everything that
 * currently matches", which is nothing the first time through an empty
 * world).
 *
 * Viewport/filter changes (`updateSubscription` bumping `state.generation`)
 * are handled as an explicit reconciliation, not a normal poll tick: the
 * diff restarts from an empty map, so everything the new viewport returns
 * is `added`, and anything the OLD map was tracking that the new poll did
 * not return is explicitly `removed` -- regardless of
 * `expire_timestamp_verified`. That last point is a deliberate departure
 * from `computeDelta`'s own rule 2 (a verified expiry never appears in
 * `removed`, because the client's own clock handles it). Rule 2 is correct
 * for a STABLE viewport, where an entity's absence from a poll really can
 * only mean it expired (Golbat filters expired pokemon out of its own
 * response -- decoder/api_pokemon_response.go:197). It does not hold across
 * a viewport change: an entity that simply left the visible area is neither
 * expired nor safe to leave on the client's map for up to its remaining
 * lifetime. "Left the viewport" is its own explicit-removal case in the
 * transport spec's list of three, so this module computes it explicitly
 * rather than resting on rule 2 for a case it was never meant to cover.
 *
 */
async function* subscribeCategory({
  golbatClient,
  state,
  signal,
  pollIntervalMs,
}: {
  golbatClient: Pick<
    ReturnType<typeof createGolbatClient>,
    'scanPokemon' | 'scanForts'
  >
  state: SubscriptionState
  signal: AbortSignal
  pollIntervalMs?: number
}) {
  const interval = pollIntervalMs ?? pollIntervalForCategory(state.category)
  let previousMap = new Map<string, any>()
  let lastGeneration = state.generation

  while (!signal.aborted) {
    const generationAtPollStart = state.generation
    const viewportChanged = generationAtPollStart !== lastGeneration
    const oldMap = previousMap
    const baseMap = viewportChanged ? new Map() : previousMap

    const { entities, complete } = await pollOnce(
      golbatClient,
      state.category,
      state.viewport,
      state.filters,
    )
    if (signal.aborted) return

    const localFilter =
      state.category === 'gym'
        ? matchesFortFilters(state.filters)
        : matchesPokemonFilters(state.filters)

    const { added, changed, removed, nextMap } = computeDelta(
      baseMap,
      entities,
      {
        complete,
        localFilter,
      },
    )

    const finalRemoved = viewportChanged
      ? [...oldMap.keys()].filter((id) => !nextMap.has(id))
      : removed

    previousMap = nextMap
    lastGeneration = generationAtPollStart

    yield {
      type: 'delta',
      category: state.category,
      added,
      changed,
      removed: finalRemoved,
    }

    await sleepOrWake(state, interval, signal)
  }
}

export {
  createSubscriptionState,
  GYM_POLL_INTERVAL_MS,
  MAX_SUBDIVISION_DEPTH,
  POKEMON_POLL_INTERVAL_MS,
  pollIntervalForCategory,
  subscribeCategory,
  updateSubscription,
}
