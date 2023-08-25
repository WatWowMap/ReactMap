/* eslint-disable react/destructuring-assignment */
import * as React from 'react'
import { Polygon, Popup, Tooltip } from 'react-leaflet'

import PopupContent from '../../popups/SubmissionCell'
import typeStyle from '../../markers/typeCell'

const TypeTile = ({
  cellColor,
  oneStopTillNext,
  twoStopsTillNext,
  noMoreGyms,
  ...cell
}) => (
  <Polygon
    key={`${cellColor}${oneStopTillNext}${twoStopsTillNext}${noMoreGyms}`}
    positions={cell.polygon}
    color={cellColor}
    opacity={0.75}
    {...typeStyle(cell, oneStopTillNext, twoStopsTillNext, noMoreGyms)}
  >
    <Popup>
      <PopupContent cell={cell} />
    </Popup>
    <Tooltip direction="center" permanent>
      {cell.count}
    </Tooltip>
  </Polygon>
)

const MemoTypeTile = React.memo(TypeTile)

export default MemoTypeTile
