// @ts-check
import * as React from 'react'
import { Polygon } from 'react-leaflet'

/**
 *
 * @param {{
 *  cellColor: string,
 *  blockedColor: string,
 *  polygon: [number, number][],
 *  blocked: boolean
 * }} param0
 * @returns
 */
const PlacementTile = ({ cellColor, blockedColor, polygon, blocked }) => (
  <Polygon
    key={`${cellColor}${blockedColor}${blocked}`}
    positions={polygon}
    interactive={false}
    color={cellColor}
    fillColor={blockedColor}
    opacity={0.75}
    fillOpacity={blocked ? 0.25 : 0}
    weight={0.35}
  />
)

const MemoPlacementTile = React.memo(PlacementTile)

export default MemoPlacementTile
