import React, { memo } from 'react'
import { Polygon, Popup, Tooltip } from 'react-leaflet'

import PopupContent from '../../popups/SubmissionCell'
import typeStyle from '../../markers/typeCell'

const TypeTile = ({ cell, tileStyle, userSettings }) => (
  <Polygon
    positions={cell.polygon}
    pathOptions={typeStyle(cell, tileStyle, userSettings)}
  >
    <Popup>
      <PopupContent cell={cell} />
    </Popup>
    <Tooltip direction="center" permanent>
      {cell.count}
    </Tooltip>
  </Polygon>
)

const areEqual = (prev, next) =>
  prev.cell.id === next.cell.id &&
  prev.cell.count === next.cell.count &&
  prev.zoom === next.zoom &&
  prev.tileStyle === next.tileStyle

export default memo(TypeTile, areEqual)
