import { getFixtureGyms, getFixturePokemon } from './fixtures'
import type {
  Bounds,
  MapChangeHandler,
  MapEntity,
  MapQuery,
  MapSource,
  Unsubscribe,
} from './types'

function isInside(bounds: Bounds, lat: number, lon: number): boolean {
  return (
    lat >= bounds.south &&
    lat <= bounds.north &&
    lon >= bounds.west &&
    lon <= bounds.east
  )
}

function matching(request: MapQuery): MapEntity[] {
  const entities =
    request.kind === 'pokemon' ? getFixturePokemon() : getFixtureGyms()
  return entities.filter((entity) =>
    isInside(request.bounds, entity.lat, entity.lon),
  )
}

/**
 * A MapSource backed by deterministic in-memory fixtures. Stands in for
 * the real WebSocket-backed source a later session implements against
 * the same interface.
 *
 * Fixtures never change, so `subscribe` delivers the matching set once
 * and hands back an unsubscribe that has nothing to undo. That is the
 * point: consumers are written against push semantics from the start,
 * so the real transport has somewhere to deliver updates without any
 * of them being rewritten.
 */
export function createFixtureSource(): MapSource {
  return {
    subscribe(request: MapQuery, onChange: MapChangeHandler): Unsubscribe {
      onChange(matching(request))
      return () => undefined
    },
  }
}
