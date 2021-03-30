/* eslint-disable prefer-destructuring */
import React from 'react'
import { Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import { useQuery } from '@apollo/client'

import Query from '../../services/Query'
import marker from './marker'
import PopupContent from './Popup'

export default function Pokemon({
  bounds, availableForms, settings, filters,
}) {
  const trimmedFilters = {}
  Object.entries(filters).forEach(filter => {
    if (filter[1].enabled) {
      trimmedFilters[filter[0]] = filter[1]
    }
  })
  const { data } = useQuery(Query.getAllPokemon(), {
    variables: {
      ...bounds, filters: trimmedFilters,
    },
  })

  return (
    <MarkerClusterGroup
      disableClusteringAtZoom={16}
    >
      {data && data.pokemon.map(pokemon => (
        <Marker
          key={pokemon.id}
          position={[pokemon.lat, pokemon.lon]}
          icon={marker(settings, availableForms, pokemon, pokemon.form)}
        >
          <Popup position={[pokemon.lat, pokemon.lon]}>
            <PopupContent pokemon={pokemon} />
          </Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  )
}
