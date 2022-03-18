import React from 'react'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point, polygon } from '@turf/helpers'

import { useStore } from '@hooks/useStore'

export default function ActiveWeather({ Icons, isNight, map, zoom, weather, isMobile }) {
  const location = useStore(state => state.location)
  const { disableColorShift = false } = Icons.getModifiers('weather')
  const active = weather.find(
    cell => cell && booleanPointInPolygon(point(location), polygon([cell.polygon])),
  )

  return active?.gameplay_condition && map.getZoom() > zoom ? (
    <div
      className="weather-icon"
      id="active-weather"
      style={{
        zIndex: 1000,
        position: 'absolute',
        top: 20,
        right: 20,
        height: isMobile ? 36 : 50,
        width: isMobile ? 36 : 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img
        className={disableColorShift ? '' : 'fancy'}
        src={Icons.getWeather(active.gameplay_condition, isNight)}
        alt={active.gameplay_condition}
        style={{
          width: isMobile ? 24 : 36,
          height: isMobile ? 24 : 36,
        }}
      />
    </div>
  ) : null
}
