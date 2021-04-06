import React, { useEffect } from 'react'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import { useQuery } from '@apollo/client'
import { useMap } from 'react-leaflet'

import Query from '../../services/Query'
import SpawnpointTile from './SpawnpointTile'

export default function Spawnpoint({ bounds, onMove }) {
  const map = useMap()

  const { data, previousData, refetch } = useQuery(Query.getAllSpawnpoints(), {
    variables: bounds,
  })

  const refetchSpawnpoint = () => {
    onMove()
    const mapBounds = map.getBounds()
    refetch({
      minLat: mapBounds._southWest.lat,
      maxLat: mapBounds._northEast.lat,
      minLon: mapBounds._southWest.lng,
      maxLon: mapBounds._northEast.lng,
    })
  }

  useEffect(() => {
    map.on('moveend', refetchSpawnpoint)
    return () => {
      map.off('moveend', refetchSpawnpoint)
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
