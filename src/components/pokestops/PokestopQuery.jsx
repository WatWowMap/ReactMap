import React, { useEffect } from 'react'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import { useQuery } from '@apollo/client'
import { useMap } from 'react-leaflet'

import Query from '../../services/Query'
import PokestopTile from './PokestopTile'

export default function PokestopQuery({ bounds, filters, onMove }) {
  const map = useMap()
  const ts = (new Date()).getTime() / 1000

  const trimmedFilters = {
    pokestops: {},
  }
  if (filters.pokestops.enabled) {
    Object.entries(filters.pokestops.filter).forEach(filter => {
      const [id, specifics] = filter
      if (specifics.enabled) {
        trimmedFilters.pokestops[id] = specifics
      }
    })
  }
  const { data, previousData, refetch } = useQuery(Query.getAllPokestops(), {
    variables: { ...bounds, filters: trimmedFilters },
  })

  const refetchStops = () => {
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
    map.on('moveend', refetchStops)
    return () => {
      map.off('moveend', refetchStops)
    }
  }, [map])

  const renderedData = data || previousData
  return (
    <MarkerClusterGroup
      disableClusteringAtZoom={14}
    >
      {renderedData && renderedData.pokestops.map((pokestop) => (
        <PokestopTile
          key={`${pokestop.id}-${pokestop.lat}-${pokestop.lon}`}
          pokestop={pokestop}
          ts={ts}
          globalFilters={filters}
        />
      ))}
    </MarkerClusterGroup>
  )
}
