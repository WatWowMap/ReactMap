// @ts-check
import { Icon } from 'leaflet'

/**
 * @param {string} iconUrl
 * @param {'start' | 'end'} position
 * @returns
 */
export default function getRouteMarker(iconUrl, position) {
  return new Icon({
    iconUrl,
    iconSize: [32, 32],
    className: `circle-route-${position}`,
  })
}
