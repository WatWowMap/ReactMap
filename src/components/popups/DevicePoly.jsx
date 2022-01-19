/* eslint-disable react/no-array-index-key */
import React, { memo } from 'react'
import { Polyline, Polygon } from 'react-leaflet'

const DevicePoly = ({ device, color }) => {
  const arrayRoute = device.route[0].lat ? [device.route] : device.route
  return arrayRoute && Array.isArray(arrayRoute) ? (
    <>
      {(device.type === 'circle_pokemon')
        ? arrayRoute.map((polygon, i) => (
          <Polyline
            key={i}
            positions={polygon.map(route => [route.lat, route.lon])}
            pathOptions={{ color }}
          />
        ))
        : arrayRoute.map((polygon, i) => (
          <Polygon
            key={i}
            positions={polygon.map(route => [route.lat, route.lon])}
            pathOptions={{ color }}
          />
        ))}
    </>
  ) : null
}

const areEqual = (prev, next) => (
  prev.device.type === next.device.type
  && prev.color === next.color
)

export default memo(DevicePoly, areEqual)
