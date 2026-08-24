import { getFixtureGyms, getFixturePokemon } from './fixtures'
import type { Bounds, MapEntity, MapQuery, MapSource } from './types'

function isInside(bounds: Bounds, lat: number, lon: number): boolean {
  return (
    lat >= bounds.south &&
    lat <= bounds.north &&
    lon >= bounds.west &&
    lon <= bounds.east
  )
}

/**
 * A MapSource backed by deterministic in-memory fixtures. Stands in for
 * the real WebSocket-backed source a later session implements against
 * the same interface.
 */
export function createFixtureSource(): MapSource {
  return {
    async query(request: MapQuery): Promise<MapEntity[]> {
      const entities =
        request.kind === 'pokemon' ? getFixturePokemon() : getFixtureGyms()
      return entities.filter((entity) =>
        isInside(request.bounds, entity.lat, entity.lon),
      )
    },
  }
}
