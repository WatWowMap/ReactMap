import * as React from 'react'
import { Circle } from 'react-leaflet'

const PoI = ({
  lat,
  lon,
  color,
}: import('@rm/types').PoI & { color: string }) => (
  <Circle
    key={color}
    center={[lat, lon]}
    radius={20}
    interactive={false}
    color={color}
    fillColor={color}
  />
)

export const PoITile = React.memo(
  PoI,
  (prev, next) => prev.color === next.color,
)
