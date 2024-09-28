import * as React from 'react'
import { Polyline, Polygon, Circle } from 'react-leaflet'
import { useStorage } from '@store/useStorage'

const BaseDevicePath = ({
  route,
  type,
  radius,
}: import('@rm/types').Device) => {
  const color = useStorage((s) => s.userSettings.admin.devicePathColor)

  const safeRoute = React.useMemo(() => {
    try {
      // check for null
      if (!route) return null
      // check for mariadb or mysql route
      const parsed = typeof route === 'string' ? JSON.parse(route) : route

      // Leveling
      if (!Array.isArray(parsed)) return parsed

      // Normalizing
      return parsed[0].lat ? [parsed] : parsed
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(e)

      return route
    }
  }, [route])

  if (!safeRoute) return null

  if (type === 'leveling') {
    return (
      <>
        <Circle center={safeRoute} color={color} radius={5} />
        <Circle center={safeRoute} color={color} radius={radius} />
      </>
    )
  }
  if (!Array.isArray(safeRoute)) return null

  return type?.includes('circle')
    ? safeRoute.map((polygon, i) => (
        <Polyline
          key={i}
          color={color}
          positions={polygon.map((poly) => [poly.lat, poly.lon])}
        />
      ))
    : safeRoute.map((polygon, i) => (
        <Polygon
          key={i}
          color={color}
          positions={polygon.map((poly) => [poly.lat, poly.lon])}
        />
      ))
}

export const DevicePath = React.memo(
  BaseDevicePath,
  (prev, next) => prev.type === next.type,
)
