/**
 * The normalized entity store every delta batch lands in, and the only
 * thing deck.gl reads its data from.
 *
 * Two shapes per category, and they exist for two different readers. The
 * `*ById` record is what a delta is applied to: an id-keyed merge is the
 * only way `added`/`changed`/`removed` can be folded in without scanning
 * an array, and it makes re-delivery of an entity the client already
 * holds an update rather than a duplicate -- which is what makes a
 * reconnect safe. The array is what deck.gl takes as a layer's `data`,
 * and it is rebuilt HERE, in the action, exactly once per batch that
 * changed something.
 *
 * That last point is the constraint the whole file is arranged around.
 * deck.gl re-uploads a layer's buffers whenever `data` changes identity,
 * and zustand runs every subscriber's selector on every write, so
 * deriving the array in a selector would be both an expensive selector
 * run N times per write and a fresh reference on every render. Deriving
 * it in the action costs one pass over the record per real change, and a
 * batch that changed nothing -- an all-empty subscribe acknowledgement,
 * a `removed` id we were never holding -- writes nothing at all and
 * leaves both arrays byte-for-byte the same object.
 *
 * The two categories are kept in separate fields for the same reason: a
 * pokemon poll landing every two seconds must not hand deck.gl a new gym
 * array and make it re-upload a layer nothing touched.
 */

import { create } from 'zustand'
import { profCount, profilingMap, profRecord } from './profile-map'
import { mergeGym, translateGymPatch, translatePokemon } from './translate'
import type { GymEntity, PokemonEntity } from './types'
import type { DeltaMessage } from './wire'

export interface EntityStoreState {
  /** Stable until a batch actually changes something. deck.gl's `data`. */
  pokemon: PokemonEntity[]
  pokemonById: Record<string, PokemonEntity>
  gyms: GymEntity[]
  gymsById: Record<string, GymEntity>
  /** Folds one delta batch in. Safe to call with an all-empty batch. */
  applyDelta: (delta: DeltaMessage) => void
  /**
   * Drops every pokemon whose VERIFIED expiry has passed, on the
   * client's own clock and with no server message. An unverified expiry
   * is Golbat's twenty-minute guess and gets extended while the spawn is
   * still being seen, so evicting on one would drop a live pokemon the
   * server believes it has already delivered -- and nothing would
   * re-send it until the viewport moved. Gyms have no expiry at all.
   */
  evictExpired: (now: number) => void
  /** Empties both categories. Not called on reconnect; see socket-client. */
  clear: () => void
}

/**
 * A row the translator refused is a row that never reaches the map, and
 * the failure looks exactly like an area with nothing in it. Golbat
 * renaming or retyping a field would present as markers quietly going
 * missing, so say it happened.
 *
 * Counted per batch and reported once rather than per row: a wire change
 * breaks every row in the batch, and a warning per row would bury the
 * signal it is meant to raise.
 */
function warnDiscarded(category: string, discarded: number, total: number) {
  if (discarded === 0) return
  // eslint-disable-next-line no-console
  console.warn(
    `[map] discarded ${discarded} of ${total} ${category} rows: required fields were missing or the wrong type. This is what a Golbat wire change looks like from here.`,
  )
}

export const useEntityStore = create<EntityStoreState>()((set, get) => ({
  pokemon: [],
  pokemonById: {},
  gyms: [],
  gymsById: {},

  applyDelta(delta) {
    const profAt = profilingMap() ? performance.now() : 0
    // The subscribe acknowledgement, and every gym reconciliation sweep
    // that found nothing. Cheap to recognise, and worth recognising: the
    // pokemon record holds thousands of keys and copying it every two
    // seconds to discover a batch was empty is work nobody asked for.
    if (
      delta.added.length === 0 &&
      delta.changed.length === 0 &&
      delta.removed.length === 0
    ) {
      return
    }

    if (delta.category === 'pokemon') {
      const byId = { ...get().pokemonById }
      let touched = false

      let discarded = 0

      for (const raw of [...delta.added, ...delta.changed]) {
        // A complete scan row replaces what we hold outright; unlike a
        // gym there is no such thing as a partial pokemon on this wire.
        const entity = translatePokemon(raw)
        if (!entity) {
          discarded += 1
          continue
        }
        byId[entity.spawnId] = entity
        touched = true
      }
      warnDiscarded(
        'pokemon',
        discarded,
        delta.added.length + delta.changed.length,
      )
      for (const id of delta.removed) {
        if (!(id in byId)) continue
        delete byId[id]
        touched = true
      }

      if (!touched) return
      profCount('store write: pokemon')
      set({ pokemonById: byId, pokemon: Object.values(byId) })
      profRecord('store apply (pokemon)', performance.now() - profAt, {
        held: Object.keys(byId).length,
      })
      return
    }

    const byId = { ...get().gymsById }
    let touched = false

    let discarded = 0

    for (const raw of [...delta.added, ...delta.changed]) {
      const patch = translateGymPatch(raw)
      if (!patch) {
        discarded += 1
        continue
      }
      // Merged over what we already hold: a gym delivered by webhook
      // carries only what its payload knew, and overwriting with the
      // patch alone would erase the rest.
      const existing = byId[patch.gymId]
      const gym = mergeGym(existing, patch)
      if (!gym) continue
      // `mergeGym` hands back the SAME object when the fold changed
      // nothing. That happens often: a webhook-sourced gym reaches us as
      // `changed` whether or not Golbat's change stamp moved, so a
      // re-fired `fort_update` for an unchanged gym is a routine message
      // rather than a rare one. Writing it anyway would rebuild the gym
      // array and make deck.gl re-upload every gym on the map.
      if (gym === existing) continue
      byId[patch.gymId] = gym
      touched = true
    }
    warnDiscarded('gym', discarded, delta.added.length + delta.changed.length)

    for (const id of delta.removed) {
      if (!(id in byId)) continue
      delete byId[id]
      touched = true
    }

    if (!touched) return
    profCount('store write: gyms')
    set({ gymsById: byId, gyms: Object.values(byId) })
    profRecord('store apply (gym)', performance.now() - profAt, {
      held: Object.keys(byId).length,
    })
  },

  evictExpired(now) {
    profCount('evictExpired ticks')
    const evictAt = profilingMap() ? performance.now() : 0
    const current = get().pokemonById

    // Two passes, and the split is the point. This runs once a second
    // forever, and at a dense viewport roughly half of those seconds have
    // nothing to evict at all -- measured at downtown Boston, zoom 13,
    // ~1,900 held: 5 of 11 ticks over ten idle seconds replaced anything.
    // Building the replacement record before knowing whether it is needed
    // paid a full copy of the record plus an `Object.entries` pair array
    // for every one of those seconds and then threw both away. A
    // `for...in` scan that stops at the first expiry allocates nothing:
    // 0.34ms -> 0.07ms per no-op tick at 1,900 held.
    let expired = false
    for (const id in current) {
      const entity = current[id]
      if (
        entity &&
        entity.expiresAtVerified === true &&
        entity.expiresAt <= now
      ) {
        expired = true
        break
      }
    }

    if (!expired) {
      profRecord('evict (nothing expired)', performance.now() - evictAt, {
        held: Object.keys(current).length,
      })
      return
    }

    const byId: Record<string, PokemonEntity> = {}
    for (const [id, entity] of Object.entries(current)) {
      if (entity.expiresAtVerified === true && entity.expiresAt <= now) continue
      byId[id] = entity
    }
    profCount('evictExpired replaced the array')
    set({ pokemonById: byId, pokemon: Object.values(byId) })
    profRecord('evict (replaced)', performance.now() - evictAt, {
      held: Object.keys(byId).length,
    })
  },

  clear() {
    set({ pokemon: [], pokemonById: {}, gyms: [], gymsById: {} })
  },
}))
