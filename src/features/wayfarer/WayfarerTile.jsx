// @ts-check
import * as React from 'react'

import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'

import { S14CellTile } from './S14Cell'
import { S17CellTile } from './S17Cell'
import { PoITile } from './PoI'

/**
 *
 * @param {import('@rm/types').SubmissionCell} props
 * @returns
 */
const Wayfarer = ({ level14Cells, level17Cells, pois }) => {
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
        <S17CellTile
          key={`pc${cell.id}-${cell.polygon.join('-')}`}
          cellColor={cellColor}
          blockedColor={cellBlocked}
          {...cell}
        />
      ))}
      {level14Cells?.map((cell) => (
        <S14CellTile
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

export const WayfarerTile = React.memo(Wayfarer)
