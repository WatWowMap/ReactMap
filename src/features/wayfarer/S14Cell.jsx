// @ts-check
import * as React from 'react'
import { Polygon, Popup, Tooltip } from 'react-leaflet'

import { WayfarerPopup } from './WayfarerPopup'
import typeStyle from '../../components/markers/typeCell'

/**
 *
 * @param {import('packages/types/lib').Level14Cell & { cellColor: string, oneStopTillNext: string, twoStopsTillNext: string, noMoreGyms: string }} props
 * @returns
 */
const S14Cell = ({
  cellColor,
  oneStopTillNext,
  twoStopsTillNext,
  noMoreGyms,
  ...cell
}) => {
  const total = cell.count_pokestops + cell.count_gyms
  return (
    <Polygon
      key={`${cellColor}${oneStopTillNext}${twoStopsTillNext}${noMoreGyms}`}
      positions={cell.polygon}
      color={cellColor}
      weight={4}
      {...typeStyle(cell, total, oneStopTillNext, twoStopsTillNext, noMoreGyms)}
    >
      <Popup>
        <WayfarerPopup {...cell} total={total} />
      </Popup>
      <Tooltip direction="center" permanent className="round-tt">
        {total || '0'}
      </Tooltip>
    </Polygon>
  )
}

export const S14CellTile = React.memo(
  S14Cell,
  (prev, next) =>
    prev.cellColor === next.cellColor &&
    prev.oneStopTillNext === next.oneStopTillNext &&
    prev.twoStopsTillNext === next.twoStopsTillNext &&
    prev.noMoreGyms === next.noMoreGyms &&
    prev.count_gyms === next.count_gyms &&
    prev.count_pokestops === next.count_pokestops,
)
