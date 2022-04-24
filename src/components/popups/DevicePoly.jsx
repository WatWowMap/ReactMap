/* eslint-disable react/no-array-index-key */
import React, { memo } from 'react'
import { Polyline, Polygon, Circle } from 'react-leaflet'

const DevicePoly = ({ device, color }) => {
  if (!device.route) return null

  if (typeof device.route === 'string') {
    device.route = JSON.parse(device.route)
  }
  if (device.type === 'leveling') {
    return (
      <>
        <Circle
          center={device.route}
          pathOptions={{ color }}
        />
        <Circle
          center={device.route}
          radius={device.radius}
          pathOptions={{ color }}
        />
      </>
    )
  }
  const arrayRoute = device.route[0].lat ? [device.route] : device.route
  if (Array.isArray(arrayRoute)) {
    return device?.type?.includes('circle')
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
      ))
  }
  return null
}

const areEqual = (prev, next) => (
  prev.device.type === next.device.type
  && prev.color === next.color
)

export default memo(DevicePoly, areEqual)
