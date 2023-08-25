import { useStatic } from '@hooks/useStore'
import { divIcon } from 'leaflet'

export default function weatherMarker(iconUrl) {
  const [
    {
      offsetX,
      offsetY,
      popupX,
      popupY,
      sizeMultiplier,
      disableColorShift = false,
    },
  ] = useStatic.getState().Icons.getModifiers('weather')

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
          width: 24px;
          height: 24px;
          padding: 2.5px;
        "
      />
    `,
  })
}
