// @ts-check
/* eslint-disable react/no-array-index-key */

import { useStorage } from '@store/useStorage'
import * as React from 'react'
import { Circle, Polygon, Polyline } from 'react-leaflet'

/**
 *
 * @param {import('@rm/types').Device} props
 * @returns
 */
const BaseDevicePath = ({ route, type, radius }) => {
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
        <Circle center={safeRoute} radius={5} color={color} />
        <Circle center={safeRoute} radius={radius} color={color} />
      </>
    )
  }
  if (!Array.isArray(safeRoute)) return null

  return type?.includes('circle')
    ? safeRoute.map((polygon, i) => (
        <Polyline
          // biome-ignore lint/suspicious/noArrayIndexKey: pre-existing, tracked for follow-up
          key={i}
          positions={polygon.map((poly) => [poly.lat, poly.lon])}
          color={color}
        />
      ))
    : safeRoute.map((polygon, i) => (
        <Polygon
          // biome-ignore lint/suspicious/noArrayIndexKey: pre-existing, tracked for follow-up
          key={i}
          positions={polygon.map((poly) => [poly.lat, poly.lon])}
          color={color}
        />
      ))
}

export const DevicePath = React.memo(
  BaseDevicePath,
  (prev, next) => prev.type === next.type,
)
