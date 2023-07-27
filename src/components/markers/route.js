// @ts-check
import { Icon } from 'leaflet'

/**
 *
 * @param {string} iconUrl
 * @returns
 */
export default function getRouteMarker(iconUrl) {
  return new Icon({
    iconUrl,
    iconAnchor: [20, 33.96],
    popupAnchor: [-5, -37],
    className: 'circle-image',
  })
}
