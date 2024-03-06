import { divIcon } from 'leaflet'
import { useMemory } from '@store/useMemory'

export function weatherMarker(iconUrl) {
  const [
    {
      offsetX,
      offsetY,
      popupX,
      popupY,
      sizeMultiplier,
      disableColorShift = false,
    },
  ] = useMemory.getState().Icons.getModifiers('weather')

  return divIcon({
    iconAnchor: [17 * offsetX, 17 * offsetY],
    popupAnchor: [popupX + 1, -20 + popupY],
    iconSize: [30 * sizeMultiplier, 30 * sizeMultiplier],
    className: 'weather-icon',
    html: /* html */ `
      <img
        class="${disableColorShift ? '' : 'fancy'}"
        alt="${iconUrl}"
        src="${iconUrl}"
        style="
          width: 26px;
          height: 26px;
          padding: 4px;
        "
      />
    `,
  })
}
