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

import { log, TAGS } from '@rm/logger'

import { computeDelta, getChangeStamp } from './delta-engine'
import { injectionMatches } from './fort-injection-match'
import type { createGolbatClient } from './golbat-client'
import { matchesFortFilters, matchesPokemonFilters } from './golbat-dnf-match'
import type { WebhookInjection } from './golbat-webhook'
import { buildPokemonMatcher } from './rule-local-filter'
import { toRuleRows } from './rule-row'
import { translatePokemonRules } from './rules-to-golbat-filters'
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
  // Fort changes pushed by Golbat's webhook sender and routed here by
  // `subscription-registry.ts`, waiting for the loop to drain them. See
  // `injectIntoSubscription` and the injection tick in `subscribeCategory`.
  injections: WebhookInjection[]
}

/**
 * Where a subscription's rules come from. Two methods rather than one
 * because the version is cheap and the rules are not: `currentVersion` is a
 * primary-key read run on every tick, and `loadRules` only runs when that
 * number moved. A rule edited on another device therefore reaches an open
 * map within one poll interval without either side polling the rules
 * themselves.
 *
 * Injected rather than imported so the loop stays testable without a
 * database, and so a connection with no session at all
 * (`ws/socket-server.ts`) can simply not have one.
 */
interface RulesSource {
  /** The profile's `rules_version`. */
  currentVersion(): Promise<number>
  /** The profile's rules, as `rules-repo.ts`'s `listRules` returns them. */
  loadRules(): Promise<any[]>
}

/** What the poll loop needs off a Golbat client, and nothing more. */
type PollingGolbatClient = Pick<
  ReturnType<typeof createGolbatClient>,
  'scanPokemon' | 'scanForts'
> &
  Partial<Pick<ReturnType<typeof createGolbatClient>, 'isFortInMemoryEnabled'>>

/**
 * How often a stationary map re-asks Golbat for its viewport.
 *
 * This does NOT govern how fast a pan updates. A viewport change calls
 * `updateSubscription`, which wakes the loop out of its sleep immediately
 * (see `sleepOrWake` and `wakePending` below), so panning costs one scan
 * regardless of what this is set to. Raising it is free for the latency
 * anyone actually feels.
 *
 * What it does govern is how quickly a NEW spawn, or an IV that arrived
 * after the encounter, shows up on a map nobody is touching. Expiry needs
 * no poll at all: the client evicts verified expiries on its own clock
 * without a server message.
 *
 * So the trade is new-spawn freshness against Golbat load, and it is
 * linear -- every halving of this doubles the scans one connection costs.
 * Ten seconds keeps a stationary map current to within a spawn or two
 * while asking Golbat for a fifth of what two seconds did. It was two
 * seconds because that is a plausible-sounding number, not a measured one.
 */
const POKEMON_POLL_INTERVAL_MS = 10_000
// Task 6 wired the fast path: a fort change reaches a subscribed client
// from Golbat's webhook sender (`golbat-webhook.ts` ->
// `subscription-registry.ts` -> the injection tick below), not from this
// poll. What is left for the poll is reconciliation -- healing a delivery
// that was lost because the socket was mid-reconnect when the webhook
// landed, and picking up anything the webhook stream never carried at all
// (an operator who enabled only some `types`, or a fort that changed while
// ReactMap was down).
//
// Five minutes is the balance point. A lost delivery leaves one fort stale
// for at most that long, which is well inside the lifetime of the shortest
// fort state a client cares about -- a raid egg is ~60 minutes and a raid
// battle ~45 -- so no client ever sees a raid come and go entirely inside
// one reconciliation gap. Going faster buys nothing (the push path already
// covers the common case) and costs a full subdivided fort scan per
// connection per cycle, which is the single most expensive request
// ReactMap makes of Golbat.
//
// Note the honest limit, documented for operators in
// docs/operators/golbat-webhooks.md: `/api/fort/scan` is gated behind
// Golbat's experimental `fort_in_memory`, which is OFF by default. On such
// an instance this poll never runs at all (see `subscribeCategory`), so
// there is no reconciliation and a dropped delivery is not healed until
// that fort changes again.
const GYM_POLL_INTERVAL_MS = 300_000

// How long a gym subscription waits before its FIRST reconciliation sweep.
// The sweep is deliberately not fired the instant a client subscribes, for
// two reasons. A scan racing an inbound webhook can deliver the pre-change
// state a moment after the webhook already delivered the post-change one,
// which is exactly the stale-overwrites-fresh ordering the push path
// exists to avoid; and a client that subscribes and then immediately
// adjusts its viewport (a pan settling, a zoom) would otherwise pay for
// two full fort scans back to back. A webhook arriving inside the delay
// cuts it short, since the injection tick is what the loop wakes for.
const GYM_INITIAL_SWEEP_DELAY_MS = 2_000

// Bounds the worst-case fan-out of one poll tick's subdivision (see
// viewport-scanner.js's `scanComplete`). The module's own default is 5
// (4^5 = 1024 leaf queries), sized for a one-off request; this poll loop
// runs continuously for as long as a connection is subscribed and a
// truncated response keeps recurring, so a shallower depth is the
// deliberately more conservative choice here. `complete: false` still comes
// out the far end whenever any leaf is still truncated at this depth, which
// is all rule 1 (limit_reached suppresses reconciliation) needs.
const MAX_SUBDIVISION_DEPTH = 2

/**
 * Golbat's real "match every pokemon" is ONE clause with no constraints,
 * never an empty filter list. An empty `filters` array builds an empty
 * lookup map, so every candidate misses the (id,form), (id,-1) and
 * (-1,-1) keys in turn and is skipped without being matched at all
 * (decoder/api_pokemon_common.go:130-146) -- Golbat's "match nothing".
 * A clause with no `pokemon` entries is keyed to (-1,-1)
 * (decoder/api_pokemon_scan_v3.go:60-70), which is the key every
 * candidate falls through to. The fort endpoint is the other way round
 * (`combinedFortMatches`: a group with no clauses matches its whole
 * type), which is why this is the pokemon scan's problem alone.
 */
const MATCH_EVERY_POKEMON: object[] = [{ pokemon: [] }]

/**
 * What to ask Golbat for on a subscription no rule set drives -- an
 * anonymous visitor on an instance that allows signed-out access, who has
 * no profile to hold rules in. Without the fallback such a visitor gets a
 * permanently empty map rather than the implicit everything the design
 * promises them.
 */
function unruledFilters(state: SubscriptionState): object[] {
  if (state.category !== 'pokemon') return state.filters
  return state.filters.length > 0 ? state.filters : MATCH_EVERY_POKEMON
}

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
    injections: [],
  }
}

/**
 * Queues fort changes pushed by Golbat for this subscription and wakes the
 * loop to deliver them.
 *
 * The wake is the same two-branch dance `updateSubscription` documents
 * below, and for the same reason: `state.wake` is non-null only while the
 * loop is parked in `sleepOrWake`, and a webhook is overwhelmingly likely
 * to arrive while it is somewhere else. Without `wakePending` a push that
 * landed during a poll or while the consumer had not yet pulled the last
 * batch would sit in the queue for a full reconciliation interval.
 */
function injectIntoSubscription(
  state: SubscriptionState,
  injections: WebhookInjection[],
) {
  if (injections.length === 0) return
  state.injections.push(...injections)
  if (state.wake) state.wake()
  else state.wakePending = true
}

/**
 * Folds one drained batch of pushed fort changes into the SAME
 * `previousMap` the poll loop diffs against, and reports what the client
 * needs to be told.
 *
 * Folding into `previousMap` is the whole point: if a webhook delivered
 * gym X to a client but the map did not learn about it, the next
 * reconciliation poll would report X as `added` all over again, and a
 * webhook-delivered removal would come straight back. `previousMap` is
 * mutated in place rather than rebuilt, because unlike a poll tick there
 * is no truncation rule to apply and nothing to reconcile against -- an
 * injection is authoritative about exactly the entities it names, and says
 * nothing at all about the ones it does not.
 *
 * Unlike `computeDelta`, an injection is emitted regardless of whether the
 * change stamp moved. Golbat's webhook payloads carry no `updated` column,
 * so `golbat-webhook.ts` stamps them with the second they were received,
 * and two changes to the same gym inside one second would otherwise
 * collapse into silence.
 *
 * `selfEvicts` is always false: a fort has no `expire_timestamp_verified`
 * and never expires on the client's own clock (delta-engine.ts, rule 2).
 */
function applyInjections(
  previousMap: Map<string, { stamp: number; selfEvicts: boolean }>,
  injections: WebhookInjection[],
): { added: any[]; changed: any[]; removed: string[] } {
  const added: any[] = []
  const changed: any[] = []
  const removed: string[] = []

  for (const injection of injections) {
    if (injection.kind === 'remove') {
      // Nothing to say about an entity this connection was never holding.
      if (previousMap.delete(injection.id)) removed.push(injection.id)
      continue
    }
    const entity = injection.entity
    const id = String(entity.id)
    const isNew = !previousMap.has(id)
    previousMap.set(id, { stamp: getChangeStamp(entity), selfEvicts: false })
    if (isNew) added.push(entity)
    else changed.push(entity)
  }

  return { added, changed, removed }
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

/**
 * Set PROFILE_MAP=1 to log what each Golbat poll costs.
 *
 * This is the hop the client cannot time. The browser can only measure
 * subscribe-to-next-delta, and the poll loop emits on its own schedule, so
 * from there a slow scan and a long wait for the next tick look identical.
 * Only the server sees the scan itself.
 *
 * What it prints is the number that decides whether a viewport is
 * expensive: how long Golbat took and how many entities it sent back
 * before any filtering. A narrow rule set returns a handful in about the
 * round-trip time; asking for everything returns thousands and takes
 * seconds, and the difference is entirely in the request.
 */
const PROFILE_POLLS = process.env.PROFILE_MAP === '1'

async function pollOnce(
  golbatClient: PollingGolbatClient,
  category: Category,
  viewport: Viewport,
  filters: object[],
): Promise<{ entities: any[]; complete: boolean }> {
  const startedAt = PROFILE_POLLS ? performance.now() : 0
  const result = await runScan(golbatClient, category, viewport, filters)
  if (PROFILE_POLLS) {
    const ms = Math.round(performance.now() - startedAt)
    const { min, max } = viewport
    log.info(
      TAGS.ReactMap,
      `[profile] ${category} poll ${ms}ms  entities=${result.entities.length}  complete=${result.complete}  clauses=${filters.length}  box=${min.lat.toFixed(3)},${min.lon.toFixed(3)}..${max.lat.toFixed(3)},${max.lon.toFixed(3)}`,
    )
  }
  return result
}

async function runScan(
  golbatClient: PollingGolbatClient,
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
  initialDelayMs,
  rulesSource,
}: {
  golbatClient: PollingGolbatClient
  state: SubscriptionState
  signal: AbortSignal
  pollIntervalMs?: number
  initialDelayMs?: number
  rulesSource?: RulesSource
}) {
  const interval = pollIntervalMs ?? pollIntervalForCategory(state.category)
  const initialDelay =
    initialDelayMs ??
    (state.category === 'gym' ? GYM_INITIAL_SWEEP_DELAY_MS : 0)
  let previousMap = new Map<string, any>()
  let lastGeneration = state.generation
  // One line per subscription, not one per skipped tick: a Golbat without
  // fort_in_memory would otherwise flood the log every interval for every
  // connected client.
  let warnedFortPollUnavailable = false

  // A connection with no rules source is one with no session behind it: an
  // anonymous visitor on an instance that allows them. There are no rules
  // to resolve for such a connection, so it keeps the pre-rules behaviour
  // (whatever the viewport holds), and `rulesVersion` stays 0 -- honestly,
  // since a version it can never change is exactly what it has.
  const rulesDrivePokemon = rulesSource != null && state.category === 'pokemon'
  let rulesVersion = 0
  // The version the rules in hand were read at, so a tick whose version has
  // not moved does not re-read them. Null until the first successful read.
  let loadedVersion: number | null = null
  let matchRules: (entity: any) => number[] = () => []
  // Golbat's own "match nothing" (rules-to-golbat-filters.ts, trap 1) is an
  // empty `filters` array, so a rule set that translates to nothing upstream
  // is a request not worth making at all. Null means "skip the scan".
  let upstreamFilters: object[] | null = null
  let warnedRulesUnavailable = false

  /**
   * Re-reads the profile's rules if, and only if, its version moved.
   *
   * A failure leaves the last known rules in place and lets the next tick
   * try again, rather than ending the subscription: a database blip should
   * cost a stale rule set for a few seconds, not every open map on the
   * instance. Before the FIRST successful read there is nothing to fall
   * back on, and the loop stays closed -- sending a user entities no rule
   * of theirs asked for is the worse of the two failures.
   */
  async function refreshRules(): Promise<void> {
    if (!rulesSource) return
    try {
      const version = await rulesSource.currentVersion()
      if (version === loadedVersion) return
      if (rulesDrivePokemon) {
        const rows = toRuleRows(await rulesSource.loadRules())
        matchRules = buildPokemonMatcher(rows)
        upstreamFilters = translatePokemonRules(rows).upstream?.filters ?? null
      }
      loadedVersion = version
      rulesVersion = version
    } catch (err) {
      if (!warnedRulesUnavailable) {
        warnedRulesUnavailable = true
        log.warn(
          TAGS.ReactMap,
          `could not read this subscription's rules; serving the last known set: ${
            (err as any)?.message || err
          }`,
        )
      }
    }
  }

  // A gym subscription defers its first sweep (see
  // GYM_INITIAL_SWEEP_DELAY_MS), and on a Golbat without fort_in_memory it
  // never sweeps at all -- so without this the client would sit in silence
  // wondering whether its subscribe was heard. Pokemon needs no equivalent:
  // its first poll fires immediately and IS the acknowledgement.
  if (state.category === 'gym') {
    await refreshRules()
    yield {
      type: 'delta',
      category: state.category,
      rulesVersion,
      added: [] as any[],
      changed: [] as any[],
      removed: [] as string[],
    }
    if (signal.aborted) return
    if (initialDelay > 0) await sleepOrWake(state, initialDelay, signal)
  }

  while (!signal.aborted) {
    // Cheap on every tick, and the whole of what makes a rule edited on
    // another device reach this one: the version is a primary-key read, and
    // the rules themselves are re-read only when it has moved.
    await refreshRules()
    if (signal.aborted) return

    // Injection tick. Not a poll: no request to Golbat, but the same
    // `previousMap` update and the same `yield`, so the pushed change and
    // the reconciliation sweep can never disagree about what this
    // connection is holding.
    if (state.injections.length > 0) {
      const drained = state.injections.splice(0, state.injections.length)
      // Matched a second time, against the viewport and filters that are
      // current NOW rather than the ones the registry saw when the webhook
      // landed. The client may have panned in between, and delivering a
      // fort it has already moved away from would emit `added` for
      // something the next sweep immediately takes back off again.
      // Removals are exempt and pass straight through -- see
      // fort-injection-match.ts.
      const matchesFilters = matchesFortFilters(state.filters)
      const batch = drained.filter((injection) =>
        injectionMatches(injection, state.viewport, matchesFilters),
      )
      const injected = applyInjections(previousMap, batch)
      if (
        injected.added.length > 0 ||
        injected.changed.length > 0 ||
        injected.removed.length > 0
      ) {
        yield {
          type: 'delta',
          category: state.category,
          rulesVersion,
          ...injected,
        }
        if (signal.aborted) return
        // Sleep before looping rather than falling straight through to a
        // poll. A webhook is the authoritative, up-to-date answer for the
        // fort it names; scanning Golbat the instant one arrives would be
        // the very round trip the push path exists to remove.
        await sleepOrWake(state, interval, signal)
        continue
      }
      // Nothing survived the re-check, so there is nothing to say and no
      // reason to park: fall through to the sweep, which is very likely
      // what the viewport change that invalidated these injections wants
      // next anyway.
    }

    // Golbat gates every fort endpoint behind `fort_in_memory`
    // (routes_huma.go:176-310), which is experimental and defaults OFF, and
    // `golbat-client.ts` refuses the request locally once `/api/status` has
    // said so. On such an instance the webhook stream is the only source of
    // fort data there is, so the subscription stays alive and
    // injection-driven instead of looping on a refusal.
    if (
      state.category === 'gym' &&
      golbatClient.isFortInMemoryEnabled?.() === false
    ) {
      if (!warnedFortPollUnavailable) {
        warnedFortPollUnavailable = true
        log.info(
          TAGS.ReactMap,
          'Golbat has fort_in_memory disabled, so gym reconciliation polling is off for this ' +
            'subscription. Fort data comes from webhooks only; a dropped delivery will not be ' +
            'healed until that fort changes again.',
        )
      }
      await sleepOrWake(state, interval, signal)
      continue
    }

    const generationAtPollStart = state.generation
    const viewportChanged = generationAtPollStart !== lastGeneration
    const oldMap = previousMap
    const baseMap = viewportChanged ? new Map() : previousMap

    // A rule set Golbat cannot be asked anything for is not a request:
    // `entities: []` is the true answer, and `complete: true` because it is
    // a complete one -- anything the client is still holding really has
    // stopped matching and must be taken back off its map.
    const skipScan = rulesDrivePokemon && upstreamFilters === null
    let entities: any[] = []
    let complete = true
    try {
      if (!skipScan) {
        ;({ entities, complete } = await pollOnce(
          golbatClient,
          state.category,
          state.viewport,
          rulesDrivePokemon ? (upstreamFilters ?? []) : unruledFilters(state),
        ))
      }
    } catch (err) {
      if (state.category !== 'gym') throw err
      // A failed reconciliation sweep is not a failed subscription: the
      // push path is what carries fort changes, and killing the generator
      // here would take the client's webhook deliveries down with it.
      if (!warnedFortPollUnavailable) {
        warnedFortPollUnavailable = true
        log.warn(
          TAGS.ReactMap,
          `gym reconciliation sweep failed; continuing on webhook deliveries alone: ${
            (err as any)?.message || err
          }`,
        )
      }
      await sleepOrWake(state, interval, signal)
      continue
    }
    if (signal.aborted) return

    // Which rules matched which entity, for this tick only. The predicate
    // `computeDelta` wants is the same question asked as a yes/no, so the
    // two can never disagree about what was sent.
    const matchedById = new Map<string, number[]>()
    const localFilter = rulesDrivePokemon
      ? (entity: any) => {
          const matched = matchRules(entity)
          if (matched.length === 0) return false
          matchedById.set(String(entity.id), matched)
          return true
        }
      : state.category === 'gym'
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

    // Copied rather than mutated: the entity came off a Golbat response
    // this loop does not own, and a `matched` array written onto it would
    // outlive the tick that computed it.
    const withMatched = (list: any[]) =>
      rulesDrivePokemon
        ? list.map((entity) => ({
            ...entity,
            matched: matchedById.get(String(entity.id)) ?? [],
          }))
        : list

    const finalRemoved = viewportChanged
      ? [...oldMap.keys()].filter((id) => !nextMap.has(id))
      : removed

    previousMap = nextMap
    lastGeneration = generationAtPollStart

    yield {
      type: 'delta',
      category: state.category,
      rulesVersion,
      added: withMatched(added),
      changed: withMatched(changed),
      removed: finalRemoved,
    }

    await sleepOrWake(state, interval, signal)
  }
}

export type { RulesSource }
export {
  createSubscriptionState,
  GYM_INITIAL_SWEEP_DELAY_MS,
  GYM_POLL_INTERVAL_MS,
  injectIntoSubscription,
  MAX_SUBDIVISION_DEPTH,
  POKEMON_POLL_INTERVAL_MS,
  pollIntervalForCategory,
  subscribeCategory,
  updateSubscription,
}
