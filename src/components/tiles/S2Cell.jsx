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

import { basicEqualFn, useStatic, useStore } from '@hooks/useStore'

import Notification from '@components/layout/general/Notification'
import { getQueryArgs } from '@services/functions/getQueryArgs'

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
  const darkTiles = useStatic((s) => s.tileStyle === 'dark')
  const color = useStore((s) =>
    darkTiles
      ? s.userSettings.s2cells.darkMapBorder
      : s.userSettings.s2cells.lightMapBorder,
  )
  /** @type {number[]} */
  const filter = useStore((s) => s.filters.s2cells.cells, basicEqualFn)
  const location = useStore((s) => s.location)
  const zoom = useStore((s) => s.zoom)

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
