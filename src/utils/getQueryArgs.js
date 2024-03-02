// @ts-check
import { useMapStore } from '@hooks/useMapStore'

export function getQueryArgs() {
  const { map } = useMapStore.getState()
  if (!map)
    return {
      zoom: 0,
      minLat: 0,
      maxLat: 0,
      minLon: 0,
      maxLon: 0,
    }
  const mapBounds = map.getBounds()
  const northEast = mapBounds.getNorthEast()
  const southWest = mapBounds.getSouthWest()
  return {
    minLat: +southWest.lat.toFixed(5),
    maxLat: +northEast.lat.toFixed(5),
    minLon: +southWest.lng.toFixed(5),
    maxLon: +northEast.lng.toFixed(5),
    zoom: Math.floor(map.getZoom()),
  }
}
