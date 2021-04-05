import React, { useEffect, useCallback } from 'react'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import { useQuery } from '@apollo/client'
import { useMap } from 'react-leaflet'

import Query from '../../services/Query'
import GymTile from './GymTile'

export default function GymQuery({
  bounds, availableForms, settings, globalFilters,
}) {
  const map = useMap()
  const ts = (new Date()).getTime() / 1000

  const { data, previousData, refetch } = !globalFilters.raids.enabled
    ? useQuery(Query.getAllGyms(), { variables: bounds })
    : useQuery(Query.getAllRaids(), { variables: bounds })

  const onMove = useCallback(() => {
    const mapBounds = map.getBounds()
    refetch({
      minLat: mapBounds._southWest.lat,
      maxLat: mapBounds._northEast.lat,
      minLon: mapBounds._southWest.lng,
      maxLon: mapBounds._northEast.lng,
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
      disableClusteringAtZoom={13}
    >
      {renderedData && renderedData.gyms.map((gym) => (
        <GymTile
          key={`${gym.id}-${gym.lat}-${gym.lon}`}
          settings={settings}
          availableForms={availableForms}
          gym={gym}
          ts={ts}
        />
      ))}
    </MarkerClusterGroup>
  )
}
