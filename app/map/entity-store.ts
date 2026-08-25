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

export const useEntityStore = create<EntityStoreState>()((set, get) => ({
  pokemon: [],
  pokemonById: {},
  gyms: [],
  gymsById: {},

  applyDelta(delta) {
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

      for (const raw of [...delta.added, ...delta.changed]) {
        // A complete scan row replaces what we hold outright; unlike a
        // gym there is no such thing as a partial pokemon on this wire.
        const entity = translatePokemon(raw)
        if (!entity) continue
        byId[entity.spawnId] = entity
        touched = true
      }
      for (const id of delta.removed) {
        if (!(id in byId)) continue
        delete byId[id]
        touched = true
      }

      if (!touched) return
      set({ pokemonById: byId, pokemon: Object.values(byId) })
      return
    }

    const byId = { ...get().gymsById }
    let touched = false

    for (const raw of [...delta.added, ...delta.changed]) {
      const patch = translateGymPatch(raw)
      if (!patch) continue
      // Merged over what we already hold: a gym delivered by webhook
      // carries only what its payload knew, and overwriting with the
      // patch alone would erase the rest.
      const gym = mergeGym(byId[patch.gymId], patch)
      if (!gym) continue
      byId[patch.gymId] = gym
      touched = true
    }
    for (const id of delta.removed) {
      if (!(id in byId)) continue
      delete byId[id]
      touched = true
    }

    if (!touched) return
    set({ gymsById: byId, gyms: Object.values(byId) })
  },

  evictExpired(now) {
    const current = get().pokemonById
    const byId: Record<string, PokemonEntity> = {}
    let evicted = false

    for (const [id, entity] of Object.entries(current)) {
      if (entity.expiresAtVerified === true && entity.expiresAt <= now) {
        evicted = true
        continue
      }
      byId[id] = entity
    }

    if (!evicted) return
    set({ pokemonById: byId, pokemon: Object.values(byId) })
  },

  clear() {
    set({ pokemon: [], pokemonById: {}, gyms: [], gymsById: {} })
  },
}))
