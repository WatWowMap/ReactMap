// server/src/services/delta-engine.ts
//
// Task 4 of the transport plan: the core of the per-connection delta
// protocol. Pure diffing only -- no network, no database, no socket. This
// is a function from (previous map, this poll's entities) to (added,
// changed, removed, next map), exactly as the transport spec describes it
// (2026-08-24-reactmap-2-0-transport-design.md, "The delta protocol").
//
// The per-connection state this module produces and consumes is a
// `Map<string, TrackedEntity>` of entity id -> a change stamp, and NOTHING
// ELSE -- never the entity itself. The caller (a poller, eventually Task
// 5's socket loop) already has the full entity in hand when it builds the
// outgoing message; storing it a second time here would be the ~90 bytes
// the spec sizes this at times two orders of magnitude, for no reason this
// module needs.
//
// The change stamp: Golbat's `updated` field, not `changed`.
// ---------------------------------------------------------------------
// Both exist on every entity family this branch touches (confirmed against
// Golbat source: decoder/api_pokemon_response.go:54, decoder/api_gym.go:149,
// decoder/api_pokestop.go:21, decoder/api_station.go:22 -- pokemon, gym,
// pokestop and station all carry `updated`; only pokemon additionally
// carries `changed`). `updated` is set on every save that has *any* dirty
// field (decoder/pokemon_state.go:145-152: `savePokemonRecordAsAtTime`
// returns early when `!pokemon.newRecord && !pokemon.IsDirty()`, otherwise
// unconditionally calls `pokemon.SetUpdated(...)`). `changed`, by contrast,
// only advances on a narrower condition -- new record, or the pokemon_id or
// cp field specifically changed (pokemon_state.go:151-153) -- and forts have
// no `changed` field at all. An IV reveal from an encounter dirties
// AtkIv/DefIv/StaIv but not necessarily PokemonId or Cp, so keying the change
// stamp on `changed` would silently miss exactly the case the task brief
// warns about. `updated` is the field that is guaranteed to advance on any
// field mutation, for every family, so it is the change stamp this module
// uses.
//
// Rule 2 (verified vs. unverified expiry) needs a second bit alongside the
// stamp: whether the entity's expiry was verified the *last time it was
// seen*, because by the time it goes missing from a poll there is no
// current record to read that flag from -- only what was remembered. So
// each tracked entry is `{ stamp, selfEvicts }`, not a bare number. This
// still costs a small, fixed amount per entry (one extra boolean-ish field
// on an already-tiny object) -- see the Task 4 report for a measured
// per-entity figure against the spec's ~90 byte estimate.

interface TrackedEntity {
  stamp: number
  selfEvicts: boolean
}

/**
 * Golbat's change stamp for any entity family (pokemon/gym/pokestop/station
 * all carry `updated`; see the module header for why this field and not
 * `changed`).
 */
function getChangeStamp(entity: any): number {
  return Number(entity.updated) || 0
}

/**
 * Rule 2: only a *verified* expiry is the client's to self-evict on its own
 * clock. Golbat's synthetic twenty-minute guess for unverified spawns
 * (`expire_timestamp_verified: false`) is not safe to evict on, and forts
 * never carry this field at all (`undefined`), so they always fall through
 * to an explicit server-sent removal -- matching the design's "forts never
 * expire, reconciliation is what they need it for".
 */
function selfEvicts(entity: any): boolean {
  return entity.expire_timestamp_verified === true
}

/**
 * The pure diff. Compares this poll's entities against the previous
 * per-connection map and returns what changed, plus the map to hold for
 * next time.
 *
 * @param {Map<string, TrackedEntity>} previousMap Per-connection state from
 *   the prior poll. Never mutated -- a fresh `Map` is always returned, so a
 *   caller free to hold onto the old one (e.g. to retry on send failure).
 * @param {any[]} rawEntities This poll's raw Golbat entities, already
 *   narrowed by whatever upstream DNF filter was sent (rules-to-golbat-filters.js).
 *   Not yet passed through `localFilter` -- filtering out entities that
 *   Golbat's filter language cannot express is a caller-supplied predicate,
 *   evaluated here (rule 3) rather than before this call, precisely so a
 *   locally-rejected entity is treated as absent for diffing purposes
 *   instead of being added and then removed on the next poll.
 * @param {{
 *   complete?: boolean,
 *   localFilter?: (entity: any) => boolean,
 * }} [options] `complete` is rule 1: pass `false` for a truncated
 *   (`limit_reached: true`) response and no removals will ever be computed,
 *   because "anything I hold that this response did not return has
 *   despawned" is false for a truncated view. `localFilter` is rule 3: an
 *   entity failing it is skipped entirely -- not added, not counted toward
 *   removal accounting, exactly as though Golbat had never returned it.
 *   Defaults to accepting every entity (no local predicates configured is
 *   not this module's business to invent; see the Task 4 report).
 */
function computeDelta(
  previousMap: Map<string, TrackedEntity>,
  rawEntities: any[],
  options: { complete?: boolean; localFilter?: (entity: any) => boolean } = {},
): {
  added: any[]
  changed: any[]
  removed: string[]
  nextMap: Map<string, TrackedEntity>
} {
  const { complete = true, localFilter = () => true } = options

  const nextMap = new Map<string, TrackedEntity>()
  const added: any[] = []
  const changed: any[] = []
  const seenIds = new Set<string>()

  for (const entity of rawEntities) {
    // Rule 3: a local-predicate rejection makes the entity absent, not
    // present-then-later-removed.
    if (!localFilter(entity)) continue

    const id = String(entity.id)
    seenIds.add(id)

    const stamp = getChangeStamp(entity)
    const tracked = { stamp, selfEvicts: selfEvicts(entity) }
    nextMap.set(id, tracked)

    const prev = previousMap.get(id)
    if (!prev) {
      added.push(entity)
    } else if (prev.stamp !== stamp) {
      changed.push(entity)
    }
    // else: same id, same stamp -- genuinely unchanged, emit nothing.
  }

  const removed: string[] = []
  if (complete) {
    // Rule 1: only a complete (non-truncated) response may drop entities
    // the client is holding that this poll did not return.
    for (const [id, prev] of previousMap) {
      if (seenIds.has(id)) continue
      // Rule 2: a verified expiry is the client's own clock's job; do not
      // tell it something it will already do itself, and stop tracking it
      // (there is nothing further this map needs to remember about it).
      if (!prev.selfEvicts) removed.push(id)
    }
  } else {
    // Truncated: carry forward every previously-tracked id this poll did
    // not (necessarily could not) return, so a later complete poll is still
    // the one that decides whether it is gone.
    for (const [id, prev] of previousMap) {
      if (!seenIds.has(id)) nextMap.set(id, prev)
    }
  }

  return { added, changed, removed, nextMap }
}

export { computeDelta, getChangeStamp, selfEvicts }
