import { Icon } from 'leaflet'
import { useMemory } from '@store/useMemory'

export function routeMarker(position: 'start' | 'end') {
  const iconUrl = useMemory.getState().Icons.getMisc(`route-${position}`)

  return new Icon({
    iconUrl,
    iconAnchor: [position === 'start' ? 12 : 20, 16],
    iconSize: [32, 32],
    popupAnchor: [0, -12],
    className: `circle-route ${position}`,
  })
}
