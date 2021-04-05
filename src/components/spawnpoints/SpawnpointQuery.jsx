import React, { useEffect, useCallback } from 'react'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import { useQuery } from '@apollo/client'
import { useMap } from 'react-leaflet'

import Query from '../../services/Query'
import SpawnpointTile from './SpawnpointTile'

export default function Spawnpoint({ bounds }) {
  const { data, previousData, refetch } = useQuery(Query.getAllSpawnpoints(), {
    variables: bounds,
  })
  const map = useMap()

  const onMove = useCallback(() => {
    const mapBounds = map.getBounds()
    refetch({
      minLat: mapBounds._southWest.lat - 0.01,
      maxLat: mapBounds._northEast.lat + 0.01,
      minLon: mapBounds._southWest.lng - 0.01,
      maxLon: mapBounds._northEast.lng + 0.01,
    })
  }, [map])

  useEffect(() => {
    map.on('moveend', onMove)
    return () => {
      map.off('moveend', onMove)
    }
  }, [map])

  const renderedData = data || previousData
  return (
    <MarkerClusterGroup
      disableClusteringAtZoom={16}
    >
      {renderedData && renderedData.spawnpoints.map(spawnpoint => (
        <SpawnpointTile
          key={`${spawnpoint.id}-${spawnpoint.lat}-${spawnpoint.lon}`}
          spawnpoint={spawnpoint}
        />
      ))}
    </MarkerClusterGroup>
  )
}
