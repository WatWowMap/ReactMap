import React, { useEffect } from 'react'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import { useQuery } from '@apollo/client'
import { useMap } from 'react-leaflet'

import Query from '../../services/Query'
import GymTile from './GymTile'

export default function GymQuery({ bounds, filters, onMove }) {
  const map = useMap()
  const ts = (new Date()).getTime() / 1000

  const { data, previousData, refetch } = !filters.gyms.raids.enabled
    ? useQuery(Query.getAllGyms(), { variables: bounds })
    : useQuery(Query.getAllRaids(), { variables: bounds })

  const refetchGyms = () => {
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
    map.on('moveend', refetchGyms)
    return () => {
      map.off('moveend', refetchGyms)
    }
  }, [map])

  const renderedData = data || previousData
  return (
    <MarkerClusterGroup
      disableClusteringAtZoom={13}
    >
      {renderedData && renderedData.gyms.map((gym) => (
        <GymTile
          key={`${gym.id}-${gym.lat}-${gym.lon}`}
          gym={gym}
          ts={ts}
        />
      ))}
    </MarkerClusterGroup>
  )
}
