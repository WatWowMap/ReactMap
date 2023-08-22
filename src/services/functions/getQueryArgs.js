import { useStatic } from '@hooks/useStore'

export function getQueryArgs() {
  const { map } = useStatic.getState()
  if (!map) return {}
  const mapBounds = map.getBounds()

  return {
    minLat: +mapBounds._southWest.lat.toFixed(5),
    maxLat: +mapBounds._northEast.lat.toFixed(5),
    minLon: +mapBounds._southWest.lng.toFixed(5),
    maxLon: +mapBounds._northEast.lng.toFixed(5),
  }
}
