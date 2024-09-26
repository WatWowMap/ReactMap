import * as React from 'react'
import { Polyline } from 'react-leaflet'

function Cell({
  coords,
  color,
}: {
  coords: import('@rm/types').S2Polygon
  color: string
}) {
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
