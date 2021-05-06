import React, { useEffect } from 'react'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import { useQuery } from '@apollo/client'
import { useMap } from 'react-leaflet'

import Query from '../../services/Query'
import GymTile from './GymTile'

export default function GymQuery({
  bounds, filters, onMove, perms,
}) {
  const map = useMap()
  const ts = (new Date()).getTime() / 1000

  const trimmedFilters = {
    onlyRaids: filters.gyms.raids,
    onlyGyms: filters.gyms.gyms,
    onlyEx: filters.gyms.exEligible,
    onlyBattle: filters.gyms.inBattle,
  }
  Object.entries(filters.gyms.filter).forEach(filter => {
    const [id, specifics] = filter
    if (specifics && specifics.enabled) {
      trimmedFilters[id] = specifics
    }
  })

  const { data, previousData, refetch } = useQuery(Query.getAllGyms(filters.gyms, perms), {
    variables: { ...bounds, filters: trimmedFilters },
  })

  const refetchGyms = () => {
    onMove()
    const mapBounds = map.getBounds()
    refetch({
      minLat: mapBounds._southWest.lat,
      maxLat: mapBounds._northEast.lat,
      minLon: mapBounds._southWest.lng,
      maxLon: mapBounds._northEast.lng,
      filters: trimmedFilters,
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
          key={`${gym.id}-${gym.updated}-${gym.raid_end_timestamp}`}
          gym={gym}
          ts={ts}
        />
      ))}
    </MarkerClusterGroup>
  )
}
