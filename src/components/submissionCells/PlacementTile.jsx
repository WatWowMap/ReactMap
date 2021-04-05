import React from 'react'
import { Polygon } from 'react-leaflet'
import placementStyle from './placementStyle'

const PlacementTile = ({ cell }) => (
  <Polygon
    positions={cell.polygon}
    pathOptions={placementStyle(cell.blocked)}
    interactive={false}
  />
)

const areEqual = (prevCell, nextCell) => (
  prevCell.id === nextCell.id
)

export default React.memo(PlacementTile, areEqual)
