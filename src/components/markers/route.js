// @ts-check
import { Icon } from 'leaflet'

import { useMemory } from '@hooks/useMemory'

/**
 * @param {'start' | 'end'} position
 * @returns
 */
export default function getRouteMarker(position) {
  const iconUrl = useMemory.getState().Icons.getMisc(`route-${position}`)
  return new Icon({
    iconUrl,
    iconAnchor: [position === 'start' ? 12 : 20, 16],
    iconSize: [32, 32],
    popupAnchor: [0, -12],
    className: `circle-route ${position}`,
  })
}
