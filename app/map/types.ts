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

export type MapEntityKind = 'pokemon' | 'gym'

export interface MapQuery {
  kind: MapEntityKind
  bounds: Bounds
  zoom: number
}

/**
 * Fields carried here are exactly what determines the icon (id, form,
 * costume, gender, badges, background, weather), what's needed to place
 * and expire the marker (lat, lon, expiresAt), and the optional stats
 * rendered as marker text (iv, level, size). Nothing speculative: a
 * field added later is cheap, one removed after something depends on it
 * is not.
 */
export interface PokemonEntity {
  kind: 'pokemon'
  id: string
  pokemonId: number
  form: number
  costume: number
  gender: number
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
  id: string
  lat: number
  lon: number
  team: number
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
