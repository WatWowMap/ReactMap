import React from 'react'
import { Polygon } from 'react-leaflet'
import Utility from '../../services/Utility'
import placementStyle from './placementStyle'

const PlacementTile = ({ cell }) => (
  <Polygon
    positions={Utility.getPolyVector(cell.id, 'polygon')}
    pathOptions={placementStyle(cell.blocked)}
    interactive={false}
  />
)

const areEqual = (prevCell, nextCell) => (
  prevCell.id === nextCell.id
)

export default React.memo(PlacementTile, areEqual)
