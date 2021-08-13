/* eslint-disable react/no-array-index-key */
import React, { memo } from 'react'
import { Polyline, Polygon } from 'react-leaflet'

const DevicePoly = ({ device, color }) => {
  const parsedRoute = JSON.parse(device.route)
  const arrayRoute = parsedRoute[0].lat ? [parsedRoute] : parsedRoute

  return (
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
  )
}

const areEqual = (prev, next) => (
  prev.device.type === next.device.type
)

export default memo(DevicePoly, areEqual)
