import { divIcon } from 'leaflet'

export default function weatherMarker(weather, Icons, timeOfDay) {
  const [
    {
      offsetX,
      offsetY,
      popupX,
      popupY,
      sizeMultiplier,
      disableColorShift = false,
    },
  ] = Icons.getModifiers('weather')

  return divIcon({
    iconAnchor: [17 * offsetX, 17 * offsetY],
    popupAnchor: [popupX + 1, -20 + popupY],
    iconSize: [30 * sizeMultiplier, 30 * sizeMultiplier],
    className: 'weather-icon',
    html: /* html */ `
      <img
        class="${disableColorShift ? '' : 'fancy'}"
        alt="${weather.gameplay_condition}"
        src="${Icons.getWeather(weather.gameplay_condition, timeOfDay)}"
        style="
          width: 24px;
          height: 24px;
          padding: 2.5px;
        "
      />
    `,
  })
}
