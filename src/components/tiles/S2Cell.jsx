import * as React from 'react'
import { Polyline, useMap } from 'react-leaflet'
import {
  S2LatLng,
  S2RegionCoverer,
  S2LatLngRect,
  S2Cell,
  S2CellId,
  S2Point,
} from 'nodes2ts'

import Utility from '@services/Utility'
import { useStore } from '@hooks/useStore'

import Notification from '@components/layout/general/Notification'

function BaseCell({ id, coords, color }) {
  return (
    <Polyline
      key={id}
      positions={[...coords, coords[0]]}
      color={color}
      weight={0.5}
    />
  )
}

const MemoBaseCell = React.memo(
  BaseCell,
  (prev, next) => prev.id === next.id && prev.color === next.color,
)

export default MemoBaseCell

function getPolyVector(s2cellId, polyline) {
  const s2cell = new S2Cell(new S2CellId(s2cellId.toString()))
  const poly = []
  for (let i = 0; i <= 3; i += 1) {
    const coordinate = s2cell.getVertex(i)
    const point = new S2Point(coordinate.x, coordinate.y, coordinate.z)
    const latLng = S2LatLng.fromPoint(point)
    poly.push([latLng.latDegrees, latLng.lngDegrees])
  }
  if (polyline) {
    poly.push(poly[0])
  }

  return poly
}

export function GenerateCells({ tileStyle, onMove }) {
  const map = useMap()
  const { s2cells: settings } = useStore((s) => s.userSettings)
  const { s2cells: filters } = useStore((s) => s.filters)
  const location = useStore((s) => s.location)
  const zoom = useStore((s) => s.zoom)

  const cells = React.useMemo(() => {
    const bounds = Utility.getQueryArgs(map)
    return filters.cells.flatMap((level) => {
      const regionCoverer = new S2RegionCoverer()
      const region = S2LatLngRect.fromLatLng(
        S2LatLng.fromDegrees(bounds.minLat, bounds.minLon),
        S2LatLng.fromDegrees(bounds.maxLat, bounds.maxLon),
      )
      regionCoverer.setMinLevel(level)
      regionCoverer.setMaxLevel(level)
      return regionCoverer.getCoveringCells(region).map((cell) => {
        const id = cell.id.toString()
        return {
          id,
          coords: getPolyVector(id),
        }
      })
    })
  }, [filters.cells, location, zoom])

  React.useEffect(() => {
    const regenerate = () => onMove()
    map.on('moveend', regenerate)
    return () => {
      map.off('moveend', regenerate)
    }
  }, [])

  const color =
    tileStyle === 'dark'
      ? settings.darkMapBorder || 'red'
      : settings.lightMapBorder || 'black'

  return (
    <>
      {cells
        .filter((_, i) => i < 20_000)
        .map((cell) => (
          <MemoBaseCell key={cell.id} {...cell} color={color} />
        ))}
      {cells.length > 20_000 && (
        <Notification
          key={cells.length}
          severity="warning"
          i18nKey="s2_cell_limit"
          messages={[
            {
              key: 'error',
              variables: [cells.length.toLocaleString()],
            },
          ]}
        />
      )}
    </>
  )
}
