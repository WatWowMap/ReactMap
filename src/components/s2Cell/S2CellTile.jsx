import React from 'react'
import { Polygon, Popup } from 'react-leaflet'
import PopupContent from './Popup'
import marker from './marker'
import Utility from '../../services/Utility'

const S2CellTile = ({ cell }) => (
  <Polygon
    positions={Utility.getPolyVector(cell.id, 'polygon')}
    pathOptions={marker(cell.updated)}
  >
    <Popup position={[cell.center_lat, cell.center_lon]}>
      <PopupContent cell={cell} />
    </Popup>
  </Polygon>
)

const areEqual = (prevCell, nextCell) => (
  prevCell.id === nextCell.id
  && prevCell.center_lat === nextCell.center_lat
  && prevCell.center_lon === nextCell.center_lon
  && prevCell.updated === nextCell.updated
)

export default React.memo(S2CellTile, areEqual)
