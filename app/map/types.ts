/**
 * The map source interface. A later session implements this for real
 * against a WebSocket transport; every task in this plan is written
 * against fixtures behind the same shape.
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
  iv?: number
  level?: number
  size?: number
}

export interface GymEntity {
  kind: 'gym'
  gymId: string
  lat: number
  lon: number
  team: Team
  inBattle: boolean
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
