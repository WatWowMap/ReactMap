// @ts-check
import * as React from 'react'

import { useStatic, useStore } from '@hooks/useStore'

import Level14Tile from './S14Cell'
import Level17Tile from './S17Cell'
import PoITile from './PoI'

/**
 *
 * @param {import('@rm/types').SubmissionCell} props
 * @returns
 */
const SubmissionCellTile = ({ level14Cells, level17Cells, pois }) => {
  const poiColor = useStore((s) => s.userSettings.wayfarer.poiColor)
  const showcaseColor = useStore((s) => s.userSettings.wayfarer.showcaseColor)
  const partnerColor = useStore((s) => s.userSettings.wayfarer.partnerColor)
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
      {pois?.map((ring) => (
        <PoITile
          key={ring.id}
          {...ring}
          color={
            ring.showcase
              ? showcaseColor
              : ring.partner
              ? partnerColor
              : poiColor
          }
        />
      ))}
      {level17Cells?.map((cell) => (
        <Level17Tile
          key={`pc${cell.id}-${cell.polygon.join('-')}`}
          cellColor={cellColor}
          blockedColor={cellBlocked}
          {...cell}
        />
      ))}
      {level14Cells?.map((cell) => (
        <Level14Tile
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
