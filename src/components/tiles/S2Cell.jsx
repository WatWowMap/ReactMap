// @ts-check
import * as React from 'react'
import { Polyline } from 'react-leaflet'
import {
  S2LatLng,
  S2RegionCoverer,
  S2LatLngRect,
  S2Cell,
  S2Point,
} from 'nodes2ts'

import { useMemory } from '@hooks/useMemory'
import { useStorage } from '@hooks/useStorage'

import Notification from '@components/Notification'
import { getQueryArgs } from '@utils/getQueryArgs'

/**
 *
 * @param {{ coords: import('@rm/types').S2Polygon, color: string }} props
 * @returns
 */
function BaseCell({ coords, color }) {
  return (
    <Polyline
      key={color}
      positions={[...coords, coords[0]]}
      color={color}
      weight={0.5}
    />
  )
}

const MemoBaseCell = React.memo(
  BaseCell,
  (prev, next) => prev.color === next.color,
)

export default MemoBaseCell

export function GenerateCells() {
  const darkTiles = useMemory((s) => s.tileStyle === 'dark')
  const color = useStorage((s) =>
    darkTiles
      ? s.userSettings.s2cells.darkMapBorder
      : s.userSettings.s2cells.lightMapBorder,
  )
  /** @type {number[]} */
  const filter = useStorage((s) => s.filters.s2cells.cells)
  const location = useStorage((s) => s.location)
  const zoom = useStorage((s) => s.zoom)

  const cells = React.useMemo(() => {
    const bounds = getQueryArgs()
    return filter.flatMap((level) => {
      const regionCoverer = new S2RegionCoverer()
      const region = S2LatLngRect.fromLatLng(
        S2LatLng.fromDegrees(bounds.minLat, bounds.minLon),
        S2LatLng.fromDegrees(bounds.maxLat, bounds.maxLon),
      )
      regionCoverer.setMinLevel(level)
      regionCoverer.setMaxLevel(level)
      return regionCoverer.getCoveringCells(region).map((cell) => {
        const s2cell = new S2Cell(cell)
        /** @type {import('@rm/types').S2Polygon} */
        const poly = []
        for (let i = 0; i <= 3; i += 1) {
          const coordinate = s2cell.getVertex(i)
          const point = new S2Point(coordinate.x, coordinate.y, coordinate.z)
          const latLng = S2LatLng.fromPoint(point)
          poly.push([latLng.latDegrees, latLng.lngDegrees])
        }
        return {
          id: cell.id.toString(),
          coords: poly,
        }
      })
    })
  }, [filter, location, zoom, color])

  return (
    <>
      {cells
        .filter((_, i) => i < 20_000)
        .map((cell) => (
          <MemoBaseCell key={cell.id} {...cell} color={color} />
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
    </>
  )
}
