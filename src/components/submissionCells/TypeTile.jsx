import React from 'react'
import { Polygon, Popup, Tooltip } from 'react-leaflet'
import PopupContent from './Popup'
import typeStyle from './typeStyle'

const TypeTile = ({ cell }) => (
  <Polygon
    positions={cell.polygon}
    pathOptions={typeStyle(cell)}
  >
    <Popup
      position={[cell.lat, cell.lon]}
    >
      <PopupContent cell={cell} />
    </Popup>
    <Tooltip
      position={[cell.lat, cell.lon]}
      direction="center"
      permanent
    >
      {cell.count}
    </Tooltip>
  </Polygon>
)

const areEqual = (prevCell, nextCell) => (
  prevCell.id === nextCell.id
  && prevCell.count_pokestops === nextCell.count_pokestops
  && prevCell.count_gyms === nextCell.count_gyms
  && prevCell.count === nextCell.count
)

export default React.memo(TypeTile, areEqual)
