/**
 * The one seam between Golbat's vocabulary and the client's.
 *
 * The socket carries what Golbat carries -- `id`, `pokemon_id`,
 * `expire_timestamp`, `team_id`, snake_case, seconds -- and everything
 * downstream of this module reads `PokemonEntity`/`GymEntity`. Nothing
 * else in `app/` touches a raw field name, and nothing here knows about
 * the store or the socket.
 *
 * Two rules the whole file follows:
 *
 * - A field the client type declares is populated from a real server
 *   field or left off. Nullable stats (`iv`, `level`, `size`, `weather`)
 *   are absent rather than zero, because zero IV is a real value and
 *   "unknown" is not. `form`, `costume` and `gender` are the exception
 *   and are coalesced to 0, which is Golbat's own unset value for all
 *   three and what the icon system means by the base appearance.
 * - Gyms merge, pokemon replace. A `changed` pokemon always comes from a
 *   complete scan row; a `changed` gym may be a webhook patch carrying
 *   only what its payload knew (`services/golbat-webhook.ts` deliberately
 *   refuses to null out the rest). So a gym is folded over what the store
 *   already holds and a pokemon simply overwrites.
 */

import type { Gender, GymEntity, PokemonEntity, Team } from './types'
import type { RawEntity } from './wire'

function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/** Golbat sends `in_battle` as 0/1 on a scan and as a bool on a webhook. */
function flag(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  const asNumber = num(value)
  return asNumber === undefined ? undefined : asNumber !== 0
}

function smallEnum(value: unknown): 0 | 1 | 2 | 3 | undefined {
  const asNumber = num(value)
  if (asNumber === 0 || asNumber === 1 || asNumber === 2 || asNumber === 3) {
    return asNumber
  }
  return undefined
}

/**
 * A Golbat pokemon as the client sees it, or null when the row is
 * missing something a marker cannot exist without: an id, a position, a
 * species, or a despawn time. Golbat's columns are nullable, so this is
 * a real branch rather than defensive noise.
 */
export function translatePokemon(raw: RawEntity): PokemonEntity | null {
  const spawnId = str(raw.id)
  const pokemonId = num(raw.pokemon_id)
  const lat = num(raw.lat)
  const lon = num(raw.lon)
  const expireSeconds = num(raw.expire_timestamp)
  if (
    spawnId === undefined ||
    pokemonId === undefined ||
    lat === undefined ||
    lon === undefined ||
    expireSeconds === undefined
  ) {
    return null
  }

  const entity: PokemonEntity = {
    kind: 'pokemon',
    spawnId,
    pokemonId,
    form: num(raw.form) ?? 0,
    costume: num(raw.costume) ?? 0,
    gender: (smallEnum(raw.gender) ?? 0) as Gender,
    lat,
    lon,
    // Golbat counts in seconds; every client clock here is milliseconds.
    expiresAt: expireSeconds * 1000,
    expiresAtVerified: raw.expire_timestamp_verified === true,
  }

  const weather = num(raw.weather)
  if (weather !== undefined) entity.weather = weather
  const iv = num(raw.iv)
  if (iv !== undefined) entity.iv = iv
  const level = num(raw.level)
  if (level !== undefined) entity.level = level
  const size = num(raw.size)
  if (size !== undefined) entity.size = size

  return entity
}

/** Whatever one gym message actually said, in the client's vocabulary. */
export interface GymPatch {
  gymId: string
  lat?: number
  lon?: number
  team?: Team
  inBattle?: boolean
}

export function translateGymPatch(raw: RawEntity): GymPatch | null {
  const gymId = str(raw.id)
  if (gymId === undefined) return null

  const patch: GymPatch = { gymId }
  const lat = num(raw.lat)
  if (lat !== undefined) patch.lat = lat
  const lon = num(raw.lon)
  if (lon !== undefined) patch.lon = lon
  const team = smallEnum(raw.team_id)
  if (team !== undefined) patch.team = team
  const inBattle = flag(raw.in_battle)
  if (inBattle !== undefined) patch.inBattle = inBattle

  return patch
}

/**
 * Folds a patch over the gym the store already holds, or null while the
 * result still has no position -- a gym with nowhere to be drawn is not
 * something deck.gl can take, and a later patch carrying a location will
 * arrive as `changed` and complete it.
 *
 * When the fold changes nothing this returns `existing` ITSELF, not an
 * equal copy, and callers are expected to compare by identity. That is
 * not a micro-optimisation: unlike the poll path, a webhook-sourced gym
 * is emitted as `changed` whether or not Golbat's change stamp moved
 * (`services/map-subscription.ts`, `applyInjections`), because the
 * payloads carry no `updated` column. Scanner senders routinely re-fire
 * `fort_update`/`gym_details` for a gym whose team, battle state and
 * position are all unchanged, so without this a re-delivery would churn
 * the store's gym array and make deck.gl re-upload every gym's buffers
 * for a message that said nothing.
 */
export function mergeGym(
  existing: GymEntity | undefined,
  patch: GymPatch,
): GymEntity | null {
  const lat = patch.lat ?? existing?.lat
  const lon = patch.lon ?? existing?.lon
  if (lat === undefined || lon === undefined) return null

  const gym: GymEntity = { kind: 'gym', gymId: patch.gymId, lat, lon }
  const team = patch.team ?? existing?.team
  if (team !== undefined) gym.team = team
  const inBattle = patch.inBattle ?? existing?.inBattle
  if (inBattle !== undefined) gym.inBattle = inBattle

  if (existing !== undefined && sameGym(existing, gym)) return existing
  return gym
}

/**
 * Field-by-field on the whole `GymEntity` shape. `gymId` is compared too
 * even though the store looks both up under the same key, so this stays
 * honest if it is ever called with two unrelated gyms.
 */
function sameGym(a: GymEntity, b: GymEntity): boolean {
  return (
    a.gymId === b.gymId &&
    a.lat === b.lat &&
    a.lon === b.lon &&
    a.team === b.team &&
    a.inBattle === b.inBattle
  )
}
