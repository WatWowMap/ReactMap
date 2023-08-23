// @ts-check
/* eslint-disable react/no-array-index-key */
import * as React from 'react'
import { Polyline, Polygon, Circle } from 'react-leaflet'

import { useStore } from '@hooks/useStore'

/**
 *
 * @param {import('@rm/types').Device} props
 * @returns
 */
const DevicePoly = ({ route, type, radius }) => {
  const color = useStore((s) => s.userSettings.admin.devicePathColor)

  const safeRoute = React.useMemo(() => {
    try {
      if (typeof route === 'string') {
        return JSON.parse(route)
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(e)
    }
    return route
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
  const arrayRoute = safeRoute[0].lat ? [safeRoute] : safeRoute
  if (Array.isArray(arrayRoute)) {
    return type?.includes('circle')
      ? arrayRoute.map((polygon, i) => (
          <Polyline
            key={i}
            positions={polygon.map((poly) => [poly.lat, poly.lon])}
            color={color}
          />
        ))
      : arrayRoute.map((polygon, i) => (
          <Polygon
            key={i}
            positions={polygon.map((poly) => [poly.lat, poly.lon])}
            color={color}
          />
        ))
  }
  return null
}

const MemoDevicePoly = React.memo(
  DevicePoly,
  (prev, next) => prev.type === next.type,
)

export default MemoDevicePoly
