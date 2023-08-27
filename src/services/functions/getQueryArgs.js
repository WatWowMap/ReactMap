import { useStatic } from '@hooks/useStore'
import getMidnight from './getMidnight'

export function getQueryArgs() {
  const { map } = useStatic.getState()
  if (!map)
    return {
      zoom: 0,
      ts: 0,
      midnight: 0,
      minLat: 0,
      maxLat: 0,
      minLon: 0,
      maxLon: 0,
    }
  const mapBounds = map.getBounds()

  return {
    minLat: +mapBounds._southWest.lat.toFixed(5),
    maxLat: +mapBounds._northEast.lat.toFixed(5),
    minLon: +mapBounds._southWest.lng.toFixed(5),
    maxLon: +mapBounds._northEast.lng.toFixed(5),
    zoom: Math.floor(map.getZoom()),
    ts: Math.floor(Date.now() / 1000),
    midnight: getMidnight(),
  }
}
