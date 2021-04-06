import React, { useEffect } from 'react'
import { useQuery } from '@apollo/client'
import { useMap } from 'react-leaflet'

import Query from '../../services/Query'
import TypeTile from './TypeTile'
import PlacementTile from './PlacementTile'
import RingTile from './RingTile'

export default function SubmissionCell({ bounds, onMove }) {
  const map = useMap()

  const { data, previousData, refetch } = useQuery(Query.getAllSubmissionCells(), {
    variables: bounds,
  })

  const refetchSubmissionCells = () => {
    onMove()
    const mapBounds = map.getBounds()
    refetch({
      minLat: mapBounds._southWest.lat - 0.01,
      maxLat: mapBounds._northEast.lat + 0.01,
      minLon: mapBounds._southWest.lng - 0.01,
      maxLon: mapBounds._northEast.lng + 0.01,
    })
  }

  useEffect(() => {
    map.on('moveend', refetchSubmissionCells)
    return () => {
      map.off('moveend', refetchSubmissionCells)
    }
  }, [map])

  const renderedData = data || previousData

  return (
    <>
      {renderedData && renderedData.submissionCells.placementCells.rings.map(ring => (
        <RingTile
          key={`${ring.id}-${ring.lat}-${ring.lon}`}
          ring={ring}
        />
      ))}
      {renderedData && renderedData.submissionCells.placementCells.cells.map(cell => (
        <PlacementTile
          key={`${cell.id}-${cell.polygon[0]}-${cell.polygon[1]}-${cell.polygon[2]}-${cell.polygon[3]}`}
          cell={cell}
        />
      ))}
      {renderedData && renderedData.submissionCells.typeCells.map(cell => (
        <TypeTile
          key={`${cell.id}-${cell.polygon[0]}-${cell.polygon[1]}-${cell.polygon[2]}-${cell.polygon[3]}`}
          cell={cell}
        />
      ))}
    </>
  )
}
