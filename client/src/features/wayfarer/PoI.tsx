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
    color={color}
    fillColor={color}
    interactive={false}
    radius={20}
  />
)

export const PoITile = React.memo(
  PoI,
  (prev, next) => prev.color === next.color,
)
