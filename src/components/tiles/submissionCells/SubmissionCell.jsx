// @ts-check
import * as React from 'react'

import { useMemory } from '@hooks/useMemory'
import { useStorage } from '@hooks/useStorage'

import Level14Tile from './S14Cell'
import Level17Tile from './S17Cell'
import PoITile from './PoI'

/**
 *
 * @param {import('@rm/types').SubmissionCell} props
 * @returns
 */
const SubmissionCellTile = ({ level14Cells, level17Cells, pois }) => {
  const poiColor = useStorage((s) => s.userSettings.wayfarer.poiColor)
  const showcaseColor = useStorage((s) => s.userSettings.wayfarer.showcaseColor)
  const partnerColor = useStorage((s) => s.userSettings.wayfarer.partnerColor)
  const cellBlocked = useStorage((s) => s.userSettings.wayfarer.cellBlocked)
  const oneStopTillNext = useStorage(
    (s) => s.userSettings.wayfarer.oneStopTillNext,
  )
  const twoStopsTillNext = useStorage(
    (s) => s.userSettings.wayfarer.twoStopsTillNext,
  )
  const noMoreGyms = useStorage((s) => s.userSettings.wayfarer.noMoreGyms)
  const darkStyle = useMemory((s) => s.tileStyle === 'dark')
  const cellColor = useStorage((s) =>
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
