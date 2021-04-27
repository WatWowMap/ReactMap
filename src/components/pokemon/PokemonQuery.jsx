import React, { useEffect } from 'react'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import { useQuery } from '@apollo/client'
import { useMap } from 'react-leaflet'

import Query from '../../services/Query'
import PokemonTile from './PokemonTile'

export default function PokemonQuery({ bounds, filters, onMove }) {
  const map = useMap()
  const trimmedFilters = {}

  Object.entries(filters.pokemon.filter).forEach(filter => {
    const [id, specifics] = filter
    if (specifics && specifics.enabled) {
      trimmedFilters[id] = specifics
    }
  })
  const { data, previousData, refetch } = useQuery(Query.getAllPokemon(), {
    variables: {
      ...bounds, filters: trimmedFilters,
    },
  })

  const refetchPokemon = () => {
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
    map.on('moveend', refetchPokemon)
    return () => {
      map.off('moveend', refetchPokemon)
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
          pokemon={pokes}
          enabled={filters.pokemon.filter[`${pokes.pokemon_id}-${pokes.form}`]}
        />
      ))}
    </MarkerClusterGroup>
  )
}
