import React from 'react'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point, polygon } from '@turf/helpers'

import { useStore, useStatic } from '@hooks/useStore'

export default function ActiveWeather({ Icons, isNight, map, activeWeatherZoom }) {
  const activeWeather = useStatic(state => state.activeWeather)
  const location = useStore(state => state.location)
  const activeCell = activeWeather.find(cell => cell && booleanPointInPolygon(point(location), polygon([cell.polygon])))

  return activeCell?.gameplay_condition && map.getZoom() > activeWeatherZoom ? (
    <div
      className="weather-icon"
      id="active-weather"
      style={{
        zIndex: 10000,
        position: 'absolute',
        top: 25,
        right: 25,
        height: 56,
        width: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img
        className="fancy"
        src={Icons.getWeather(activeCell.gameplay_condition, isNight)}
        alt={activeCell.gameplay_condition}
        style={{
          width: 50,
          height: 50,
        }}
      />
    </div>
  ) : null
}
