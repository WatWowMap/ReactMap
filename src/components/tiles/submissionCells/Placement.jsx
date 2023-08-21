// @ts-check
import * as React from 'react'
import { Polygon } from 'react-leaflet'

import placementStyle from '../../markers/placementCell'

const PlacementTile = ({ cell, tileStyle, userSettings }) => (
  <Polygon
    positions={cell.polygon}
    pathOptions={placementStyle(cell.blocked, tileStyle, userSettings)}
    interactive={false}
  />
)

const areEqual = (prev, next) =>
  prev.cell.id === next.cell.id &&
  prev.zoom === next.zoom &&
  prev.tileStyle === next.tileStyle

const MemoPlacementTile = React.memo(PlacementTile, areEqual)

export default MemoPlacementTile
