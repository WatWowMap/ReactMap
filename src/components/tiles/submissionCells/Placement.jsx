import React, { memo } from 'react'
import { Polygon } from 'react-leaflet'

import placementStyle from '../../markers/placementCell'

const PlacementTile = ({ cell }) => (
  <Polygon
    positions={cell.polygon}
    pathOptions={placementStyle(cell.blocked)}
    interactive={false}
  />
)

const areEqual = (prev, next) => (
  prev.cell.id === next.cell.id
)

export default memo(PlacementTile, areEqual)
