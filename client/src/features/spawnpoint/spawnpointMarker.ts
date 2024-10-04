import { Icon } from 'leaflet'

export function spawnpointMarker(
  iconUrl: string,
  size: number,
  modifiers: {
    offsetX: number
    offsetY: number
    popupX: number
    popupY: number
  },
) {
  return new Icon({
    iconUrl,
    iconSize: [size, size],
    iconAnchor: [size / 2 + modifiers.offsetX, size / 2 + modifiers.offsetY],
    popupAnchor: [0 + modifiers.popupX, size * -0.6 + modifiers.popupY],
    className: 'marker',
  })
}
