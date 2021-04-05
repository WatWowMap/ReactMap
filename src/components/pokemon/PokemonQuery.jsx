import React, { useEffect, useCallback } from 'react'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import { useQuery } from '@apollo/client'
import { useMap } from 'react-leaflet'

import Query from '../../services/Query'
import PokemonTile from './PokemonTile'

export default function PokemonQuery({
  bounds, availableForms, settings, filters,
}) {
  const map = useMap()

  const trimmedFilters = {}
  Object.entries(filters).forEach(filter => {
    const [id, specifics] = filter
    if (specifics.enabled) {
      trimmedFilters[id] = specifics
    }
  })
  const { data, previousData, refetch } = useQuery(Query.getAllPokemon(), {
    variables: {
      ...bounds, filters: trimmedFilters,
    },
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
      disableClusteringAtZoom={15}
    >
      {renderedData && renderedData.pokemon.map((pokes) => (
        <PokemonTile
          key={`${pokes.id}-${pokes.lat}-${pokes.lon}`}
          settings={settings}
          availableForms={availableForms}
          pokemon={pokes}
        />
      ))}
    </MarkerClusterGroup>
  )
}
