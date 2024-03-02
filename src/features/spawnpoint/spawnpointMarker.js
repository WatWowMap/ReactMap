// @ts-check
import { Icon } from 'leaflet'

/**
 *
 * @param {string} iconUrl
 * @param {number} size
 * @param {{ offsetX: number, offsetY: number, popupX: number, popupY: number }} modifiers
 * @returns
 */
export function spawnpointMarker(iconUrl, size, modifiers) {
  return new Icon({
    iconUrl,
    iconSize: [size, size],
    iconAnchor: [size / 2 + modifiers.offsetX, size / 2 + modifiers.offsetY],
    popupAnchor: [0 + modifiers.popupX, size * -0.6 + modifiers.popupY],
    className: 'marker',
  })
}
