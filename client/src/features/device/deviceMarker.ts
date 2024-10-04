import { Icon } from 'leaflet'

export function deviceMarker(
  iconUrl: string,
  iconSize: number,
  modifiers: import('../../services/Assets').UAssets['modifiers']['base'],
) {
  const { sizeMultiplier, offsetX, offsetY, popupX, popupY } = modifiers

  return new Icon({
    iconUrl,
    iconSize: [iconSize * sizeMultiplier, iconSize * sizeMultiplier],
    iconAnchor: [20 * offsetX, 33.96 * offsetY],
    popupAnchor: [-5 + popupX, -37 + popupY],
    className: 'marker',
  })
}
