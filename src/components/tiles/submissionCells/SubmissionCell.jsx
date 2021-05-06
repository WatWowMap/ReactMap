import React from 'react'
import TypeTile from './Type'
import PlacementTile from './Placement'
import RingTile from './Ring'

export default function SubmissionCellTile({ item, map }) {
  const zoom = map.getZoom()
  return (
    <>
      {zoom > 15 && map.getZoom() > 12 && item.placementCells.rings.map(ring => (
        <RingTile
          key={`r${ring.id}-${ring.lat}-${ring.lon}`}
          ring={ring}
        />
      ))}
      {zoom > 15 && item.placementCells.cells.map(cell => (
        <PlacementTile
          key={`pc${cell.id}-${cell.polygon[0]}-${cell.polygon[1]}-${cell.polygon[2]}-${cell.polygon[3]}`}
          cell={cell}
        />
      ))}
      {item.typeCells.map(cell => (
        <TypeTile
          key={`tc${cell.id}-${cell.polygon[0]}-${cell.polygon[1]}-${cell.polygon[2]}-${cell.polygon[3]}`}
          cell={cell}
        />
      ))}
    </>
  )
}
