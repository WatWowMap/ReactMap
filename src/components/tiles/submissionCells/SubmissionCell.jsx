import * as React from 'react'

import { useStatic, useStore } from '@hooks/useStore'

import TypeTile from './Type'
import PlacementTile from './Placement'
import RingTile from './Ring'

/**
 *
 * @param {{ typeCells: any[], placementCells: { rings: any[], cells: any[] }}} item
 * @returns
 */
const SubmissionCellTile = ({
  typeCells,
  placementCells: { cells, rings },
}) => {
  const poiColor = useStore((s) => s.userSettings.wayfarer.poiColor)
  const cellBlocked = useStore((s) => s.userSettings.wayfarer.cellBlocked)
  const oneStopTillNext = useStore(
    (s) => s.userSettings.wayfarer.oneStopTillNext,
  )
  const twoStopsTillNext = useStore(
    (s) => s.userSettings.wayfarer.twoStopsTillNext,
  )
  const noMoreGyms = useStore((s) => s.userSettings.wayfarer.noMoreGyms)
  const darkStyle = useStatic((s) => s.tileStyle === 'dark')
  const cellColor = useStore((s) =>
    darkStyle
      ? s.userSettings.wayfarer.darkMapBorder
      : s.userSettings.wayfarer.lightMapBorder,
  )
  return (
    <>
      {rings?.map((ring) => (
        <RingTile key={ring.id} {...ring} color={poiColor} />
      ))}
      {cells?.map((cell) => (
        <PlacementTile
          key={`pc${cell.id}-${cell.polygon.join('-')}`}
          cellColor={cellColor}
          blockedColor={cellBlocked}
          {...cell}
        />
      ))}
      {typeCells?.map((cell) => (
        <TypeTile
          key={`tc${cell.id}-${cell.polygon.join('-')}`}
          cellColor={cellColor}
          oneStopTillNext={oneStopTillNext}
          twoStopsTillNext={twoStopsTillNext}
          noMoreGyms={noMoreGyms}
          {...cell}
        />
      ))}
    </>
  )
}

const MemoSubmissionCell = React.memo(SubmissionCellTile)

export default MemoSubmissionCell
