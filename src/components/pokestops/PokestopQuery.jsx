import React, { useEffect, useCallback } from 'react'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import { useQuery } from '@apollo/client'
import { useMap } from 'react-leaflet'

import Query from '../../services/Query'
import PokestopTile from './PokestopTile'

export default function PokestopQuery({
  bounds, availableForms, settings, globalFilters,
}) {
  const map = useMap()
  const ts = (new Date()).getTime() / 1000

  const trimmedFilters = {
    pokestops: {},
  }
  if (globalFilters.pokestops.enabled) {
    Object.entries(globalFilters.pokestops.filter).forEach(filter => {
      const [id, specifics] = filter
      if (specifics.enabled) {
        trimmedFilters.pokestops[id] = specifics
      }
    })
  }
  const { data, previousData, refetch } = useQuery(Query.getAllPokestops(), {
    variables: { ...bounds, filters: trimmedFilters },
  })

  const onMove = useCallback(() => {
    const mapBounds = map.getBounds()
    refetch({
      minLat: mapBounds._southWest.lat,
      maxLat: mapBounds._northEast.lat,
      minLon: mapBounds._southWest.lng,
      maxLon: mapBounds._northEast.lng,
      filters: trimmedFilters,
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
      disableClusteringAtZoom={14}
    >
      {renderedData && renderedData.pokestops.map((pokestop) => (
        <PokestopTile
          key={`${pokestop.id}-${pokestop.lat}-${pokestop.lon}`}
          settings={settings}
          availableForms={availableForms}
          pokestop={pokestop}
          ts={ts}
          globalFilters={globalFilters}
        />
      ))}
    </MarkerClusterGroup>
  )
}
