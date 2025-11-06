// @ts-check
import * as React from 'react'
import { S2LatLng, S2RegionCoverer, S2LatLngRect } from 'nodes2ts'

import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { Notification } from '@components/Notification'
import { getQueryArgs } from '@utils/getQueryArgs'
import { getS2Polygon } from '@utils/getS2Polygon'

import { BaseCell } from './BaseCell'

export function GenerateCells() {
  const darkTiles = useMemory((s) => s.tileStyle === 'dark')
  const color = useStorage((s) =>
    darkTiles
      ? s.userSettings.s2cells.darkMapBorder
      : s.userSettings.s2cells.lightMapBorder,
  )
  /** @type {number[]} */
  const filter = useStorage((s) => s.filters?.s2cells?.cells)
  const location = useStorage((s) => s.location)
  const zoom = useStorage((s) => s.zoom)

  const cells = React.useMemo(() => {
    const bounds = getQueryArgs()
    return filter?.flatMap((level) => {
      if (level > zoom) return []

      const regionCoverer = new S2RegionCoverer()
      const region = S2LatLngRect.fromLatLng(
        S2LatLng.fromDegrees(bounds.minLat, bounds.minLon),
        S2LatLng.fromDegrees(bounds.maxLat, bounds.maxLon),
      )
      regionCoverer.setMinLevel(level)
      regionCoverer.setMaxLevel(level)
      return regionCoverer.getCoveringCells(region).flatMap((cell) => {
        const coords = getS2Polygon(cell)
        return coords
          ? [
              {
                id: cell.id.toString(),
                coords,
              },
            ]
          : []
      })
    })
  }, [filter, location, zoom, color])

  return filter ? (
    <>
      {cells
        .filter((_, i) => i < 20_000)
        .map((cell) => (
          <BaseCell key={cell.id} {...cell} color={color} />
        ))}
      <Notification
        open={cells.length > 20_000}
        severity="warning"
        i18nKey="s2_cell_limit"
        messages={[
          {
            key: 'error',
            variables: [cells.length.toLocaleString()],
          },
        ]}
      />
      <Notification
        open={filter.some((x) => x > zoom)}
        severity="warning"
        title="s2_cell_zoom_limit"
      />
    </>
  ) : null
}
