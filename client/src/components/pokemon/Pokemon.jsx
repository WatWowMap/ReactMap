import React from 'react'
import { Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-markercluster'

import { useQuery } from '@apollo/client'
import Query from '../../services/Query.js'

import marker from './marker.js'
import PopupContent from './Popup.jsx'
import masterfile from '../../data/masterfile.json'

const Pokemon = ({ bounds, availableForms, settings, filters }) => {
  const trimmedFilters = {}
  Object.entries(filters).forEach(filter => {
    if (filter[1].enabled) {
      trimmedFilters[filter[0]] = filter[1]
    }
  })
  const { loading, error, data } = useQuery(Query.getAllPokemon(), {
    variables: {
      ...bounds, filters: trimmedFilters
    }
  })

  return (
    <MarkerClusterGroup
      disableClusteringAtZoom={16}
    >
      {data && data.pokemon.reduce((result, pokemon) => {
        let realForm = pokemon.form
        if (pokemon.form === 0 && masterfile.pokemon[pokemon.pokemon_id].default_form_id) {
          realForm = masterfile.pokemon[pokemon.pokemon_id].default_form_id
        }
        if (filters[`${pokemon.pokemon_id}-${realForm}`].enabled) {
          result.push(
            <Marker
              key={pokemon.id}
              position={[pokemon.lat, pokemon.lon]}
              icon={marker(settings, availableForms, pokemon, realForm)}>
              <Popup position={[pokemon.lat, pokemon.lon]}>
                <PopupContent pokemon={pokemon} />
              </Popup>
            </Marker>
          )
        }
        return result
      }, [])}
    </MarkerClusterGroup>
  )
}

export default Pokemon
