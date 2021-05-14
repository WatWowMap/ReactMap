import React, { memo } from 'react'
import { Polyline, Polygon } from 'react-leaflet'
import { useMasterfile } from '../../hooks/useStore'

const DevicePoly = ({ device }) => {
  const { map: { theme } } = useMasterfile(state => state.config)
  const parsedRoute = JSON.parse(device.route)
  const routeCheck = parsedRoute.length === 1 ? parsedRoute[0] : parsedRoute
  const poly = routeCheck.map(route => [route.lat, route.lon])

  return (
    <>
      {device.type === 'circle_pokemon'
        ? (
          <Polyline
            positions={poly}
            pathOptions={{ color: theme.devicePathColor }}
          />
        ) : (
          <Polygon
            positions={poly}
            pathOptions={{ color: theme.devicePathColor }}
          />
        )}
    </>
  )
}

const areEqual = (prev, next) => (
  prev.device.type === next.device.type
)

export default memo(DevicePoly, areEqual)
