// @ts-check
import { Icon } from 'leaflet'

import { useStatic } from '@hooks/useStore'

/**
 * @param {'start' | 'end'} position
 * @returns
 */
export default function getRouteMarker(position) {
  const iconUrl = useStatic.getState().Icons.getMisc(`route-${position}`)
  return new Icon({
    iconUrl,
    iconAnchor: [position === 'start' ? 12 : 20, 16],
    iconSize: [32, 32],
    popupAnchor: [0, -12],
    className: `circle-route ${position}`,
  })
}
