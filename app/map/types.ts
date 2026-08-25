/**
 * The client's own vocabulary for what is on the map, plus the
 * pull-shaped `MapSource` the fixtures implement.
 *
 * The live transport does NOT go through `MapSource`. It pushes delta
 * batches into the entity store (`./entity-store`), because a source
 * that hands back the full set on every change is exactly the rebuild
 * deck.gl must not be given every two seconds. `MapSource` and
 * `./fixtures` remain what the layer and clustering tests are written
 * against: a deterministic set with no socket in it.
 */

export interface Bounds {
  west: number
  south: number
  east: number
  north: number
}

/** What the camera currently frames: the area, and how far in it is. */
export interface Viewport {
  bounds: Bounds
  zoom: number
}

export type MapEntityKind = 'pokemon' | 'gym'

export interface MapQuery {
  kind: MapEntityKind
  bounds: Bounds
  zoom: number
}

/** 0 unset, 1 male, 2 female, 3 genderless. */
export type Gender = 0 | 1 | 2 | 3

/** 0 uncontested, 1 Mystic, 2 Valor, 3 Instinct. */
export type Team = 0 | 1 | 2 | 3

/**
 * Fields carried here are exactly what determines the icon (pokemonId,
 * form, costume, gender, badge, background, weather), what's needed to
 * place and expire the marker (lat, lon, expiresAt), and the optional
 * stats rendered as marker text (iv, level, size). Nothing speculative:
 * a field added later is cheap, one removed after something depends on
 * it is not.
 *
 * `spawnId` identifies one encounter and changes every time the pokemon
 * respawns, so it is useless as a cache key. `pokemonId` is the species
 * and is what anything keyed on appearance must use.
 */
export interface PokemonEntity {
  kind: 'pokemon'
  spawnId: string
  pokemonId: number
  /** Left as open numbers: valid values vary per species. */
  form: number
  costume: number
  gender: Gender
  badge?: number
  background?: number
  weather?: number
  lat: number
  lon: number
  expiresAt: number
  /**
   * Whether `expiresAt` is a despawn time the scanner actually observed
   * rather than Golbat's twenty-minute guess. Only a verified expiry is
   * safe to evict on the client's own clock: an unverified one gets
   * extended while the spawn is still being seen, so a client that
   * dropped it would lose a live pokemon the server believes it has
   * already delivered, and nothing would re-send it.
   *
   * Optional because a source may not know -- the fixtures do not -- and
   * "unknown" must behave like "unverified", which is the reading a
   * missing field already gets.
   */
  expiresAtVerified?: boolean
  iv?: number
  level?: number
  size?: number
}

/**
 * `team` and `inBattle` are optional because a gym is not always
 * delivered whole. On a Golbat with `fort_in_memory` off -- the default
 * -- gyms arrive only as webhook patches, and a raid webhook genuinely
 * does not know whether the gym is in battle. Both columns are nullable
 * on the scan response too (decoder/api_gym.go). Rendering picks a
 * fallback; the store does not invent one.
 */
export interface GymEntity {
  kind: 'gym'
  gymId: string
  lat: number
  lon: number
  team?: Team
  inBattle?: boolean
}

export type MapEntity = PokemonEntity | GymEntity

/** Called with the full current set, then again whenever it changes. */
export type MapChangeHandler = (entities: MapEntity[]) => void

/** Returned by subscribe; calling it stops delivery. */
export type Unsubscribe = () => void

/**
 * Subscription is the only operation because the real transport pushes.
 * A caller that wants a single answer uses `queryOnce` from ./query,
 * which is that push stream read once, so there is one code path to
 * implement and one to get wrong.
 */
export interface MapSource {
  subscribe(request: MapQuery, onChange: MapChangeHandler): Unsubscribe
}
