import React, { useEffect } from 'react'
import { useQuery } from '@apollo/client'
import { useMap } from 'react-leaflet'

import Query from '../../services/Query'
import S2CellTile from './S2CellTile'

export default function S2Cell({ bounds, onMove }) {
  const { data, previousData, refetch } = useQuery(Query.getAllS2Cells(), {
    variables: bounds,
  })

  const map = useMap()

  const refetchCells = () => {
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
    map.on('moveend', refetchCells)
    return () => {
      map.off('moveend', refetchCells)
    }
  }, [map])

  const renderedData = data || previousData
  return (
    <>
      {renderedData && renderedData.s2Cells.map(cell => (
        <S2CellTile
          key={`${cell.id}-${cell.center_lat}-${cell.center_lon}`}
          cell={cell}
        />
      ))}
    </>
  )
}
