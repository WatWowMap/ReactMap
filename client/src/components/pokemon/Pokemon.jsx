import React from 'react'
import { Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-markercluster'

import { useQuery } from '@apollo/client'
import Query from '../../services/Query.js'

import marker from './marker.js'
import PopupContent from './Popup.jsx'

const Pokemon = ({ bounds, availableForms, settings }) => {
  const { loading, error, data } = useQuery(Query.getAllPokemon(), {
    variables: bounds
  })

  return (
    <MarkerClusterGroup
      disableClusteringAtZoom={16}
    >
      {data && data.pokemon.map(pokemon => {
        return (
          <Marker
            key={pokemon.id}
            position={[pokemon.lat, pokemon.lon]}
            icon={marker(settings, availableForms, pokemon)}>
            <Popup position={[pokemon.lat, pokemon.lon]}>
              <PopupContent pokemon={pokemon} />
            </Popup>
          </Marker>
        )
      })}
    </MarkerClusterGroup>
  )
}

export default Pokemon
