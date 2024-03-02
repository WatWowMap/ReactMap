// @ts-check
import * as React from 'react'
import { Polygon } from 'react-leaflet'

/**
 *
 * @param {{
 *  cellColor: string,
 *  blockedColor: string,
 * } & import('@rm/types').Level17Cell} props
 * @returns
 */
const S17Cell = ({ cellColor, blockedColor, polygon, blocked }) => (
  <Polygon
    key={`${cellColor}${blockedColor}${blocked}`}
    positions={polygon}
    interactive={false}
    color={cellColor}
    fillColor={blockedColor}
    fillOpacity={blocked ? 0.25 : 0}
    weight={1}
  />
)

const MemoS17Cell = React.memo(
  S17Cell,
  (prev, next) =>
    prev.blocked === next.blocked &&
    prev.blockedColor === next.blockedColor &&
    prev.cellColor === next.cellColor,
)

export default MemoS17Cell
