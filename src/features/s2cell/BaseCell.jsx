// @ts-check
import * as React from 'react'
import { Polyline } from 'react-leaflet'

/**
 *
 * @param {{ coords: import('@rm/types').S2Polygon, color: string }} props
 * @returns
 */
function Cell({ coords, color }) {
  return (
    <Polyline
      key={color}
      positions={[...coords, coords[0]]}
      color={color}
      weight={0.5}
    />
  )
}

export const BaseCell = React.memo(
  Cell,
  (prev, next) => prev.color === next.color,
)
