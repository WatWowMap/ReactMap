import React from 'react'
import { renderToString } from 'react-dom/server'
import L from 'leaflet'

export default function weatherMarker(weather, Icons, isNight) {
  return L.divIcon({
    iconAnchor: [20, 20],
    popupAnchor: [-2.5, -20],
    className: 'weather-icon',
    html: renderToString(
      <div className="weather-fancy">
        <img
          src={Icons.getWeather(weather.gameplay_condition, isNight)}
          style={{
            width: 24,
            height: 24,
            padding: 2.5,
          }}
        />
      </div>,
    ),
  })
}
