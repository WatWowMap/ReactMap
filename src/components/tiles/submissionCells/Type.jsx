import React, { memo } from 'react'
import { Polygon, Popup, Tooltip } from 'react-leaflet'

import PopupContent from '../../popups/SubmissionCell'
import typeStyle from '../../markers/typeCell'

const TypeTile = ({ cell, tileStyle }) => (
  <Polygon
    positions={cell.polygon}
    pathOptions={typeStyle(cell, tileStyle)}
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

const areEqual = (prev, next) => (
  prev.cell.id === next.cell.id
  && prev.cell.count === next.cell.count
  && prev.zoom === next.zoom
)

export default memo(TypeTile, areEqual)
