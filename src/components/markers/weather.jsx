import React from 'react'
import { renderToString } from 'react-dom/server'
import L from 'leaflet'

export default function weatherMarker(weather, Icons, isNight) {
  const { offsetX, offsetY, popupX, popupY, sizeMultiplier, disableColorShift = false } = Icons.getModifiers('weather')

  return L.divIcon({
    iconAnchor: [17 * offsetX, 17 * offsetY],
    popupAnchor: [popupX + 1, -20 + popupY],
    iconSize: [30 * sizeMultiplier, 30 * sizeMultiplier],
    className: 'weather-icon',
    html: renderToString(
      <img
        className={disableColorShift ? '' : 'fancy'}
        src={Icons.getWeather(weather.gameplay_condition, isNight)}
        style={{
          width: 24,
          height: 24,
          padding: 2.5,
        }}
      />,
    ),
  })
}
