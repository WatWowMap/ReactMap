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

export interface MapSource {
  query(request: MapQuery): Promise<MapEntity[]>
}
