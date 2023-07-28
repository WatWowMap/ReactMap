// @ts-check
import { Icon } from 'leaflet'

/**
 * @param {string} iconUrl
 * @param {boolean} end
 * @returns
 */
export default function getRouteMarker(iconUrl, end = false) {
  return new Icon({
    iconUrl,
    iconSize: [32, 32],
    className: `circle-route-${end ? 'end' : 'start'}`,
  })
}
