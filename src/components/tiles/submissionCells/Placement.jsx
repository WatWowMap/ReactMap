import React, { memo } from 'react'
import { Polygon } from 'react-leaflet'

import placementStyle from '../../markers/placementCell'

const PlacementTile = ({ cell, tileStyle }) => (
  <Polygon
    positions={cell.polygon}
    pathOptions={placementStyle(cell.blocked, tileStyle)}
    interactive={false}
  />
)

const areEqual = (prev, next) => (
  prev.cell.id === next.cell.id
  && prev.zoom === next.zoom
)

export default memo(PlacementTile, areEqual)
