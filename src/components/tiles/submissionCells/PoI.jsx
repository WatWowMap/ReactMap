// @ts-check
import * as React from 'react'
import { Circle } from 'react-leaflet'

/**
 *
 * @param {import('@rm/types').PoI & { color: string }} param0
 * @returns
 */
const PoITile = ({ lat, lon, color }) => (
  <Circle
    key={color}
    center={[lat, lon]}
    radius={20}
    interactive={false}
    color={color}
    fillColor={color}
  />
)

const MemoPoI = React.memo(PoITile, (prev, next) => prev.color === next.color)

export default MemoPoI
