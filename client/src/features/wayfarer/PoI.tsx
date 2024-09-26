// @ts-check
import * as React from 'react'
import { Circle } from 'react-leaflet'

/**
 *
 * @param {import('@rm/types').PoI & { color: string }} param0
 * @returns
 */
const PoI = ({ lat, lon, color }) => (
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
