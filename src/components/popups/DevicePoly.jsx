import React, { memo } from 'react'
import { Polyline, Polygon } from 'react-leaflet'

const DevicePoly = ({ device, color }) => {
  const parsedRoute = JSON.parse(device.route)
  const routeCheck = parsedRoute.length === 1 ? parsedRoute[0] : parsedRoute
  const poly = routeCheck.map(route => [route.lat, route.lon])

  return (
    <>
      {(device.type === 'circle_pokemon')
        ? (
          <Polyline
            positions={poly}
            pathOptions={{ color }}
          />
        ) : (
          <Polygon
            positions={poly}
            pathOptions={{ color }}
          />
        )}
    </>
  )
}

const areEqual = (prev, next) => (
  prev.device.type === next.device.type
)

export default memo(DevicePoly, areEqual)
