// @ts-check

import { Icon } from 'leaflet'

/**
 * @param {string} iconUrl
 * @param {number} iconSize
 * @param {import("../../services/Assets").UAssets['modifiers']['base']} modifiers
 */
export function deviceMarker(iconUrl, iconSize, modifiers) {
  const { sizeMultiplier, offsetX, offsetY, popupX, popupY } = modifiers
  return new Icon({
    iconUrl,
    iconSize: [iconSize * sizeMultiplier, iconSize * sizeMultiplier],
    iconAnchor: [20 * offsetX, 33.96 * offsetY],
    popupAnchor: [-5 + popupX, -37 + popupY],
    className: 'marker',
  })
}
