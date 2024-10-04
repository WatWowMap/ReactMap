import * as React from 'react'
import { Polygon } from 'react-leaflet'

const S17Cell = ({
  cellColor,
  blockedColor,
  polygon,
  blocked,
}: {
  cellColor: string
  blockedColor: string
} & import('@rm/types').Level17Cell) => (
  <Polygon
    key={`${cellColor}${blockedColor}${blocked}`}
    color={cellColor}
    fillColor={blockedColor}
    fillOpacity={blocked ? 0.25 : 0}
    interactive={false}
    positions={polygon}
    weight={1}
  />
)

export const S17CellTile = React.memo(
  S17Cell,
  (prev, next) =>
    prev.blocked === next.blocked &&
    prev.blockedColor === next.blockedColor &&
    prev.cellColor === next.cellColor,
)
