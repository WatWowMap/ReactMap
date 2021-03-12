import React from 'react'
import { Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-markercluster'

import { useQuery } from '@apollo/client'
import Query from '../../services/Query.js'

import marker from './marker.js'
import PopupContent from './Popup.jsx'

const Pokemon = ({ bounds }) => {
  const { loading, error, data } = useQuery(Query.getAllPokemon(), {
    variables: {
      minLat: bounds._southWest.lat,
      minLon: bounds._southWest.lng,
      maxLat: bounds._northEast.lat,
      maxLon: bounds._northEast.lng
    }
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
            icon={marker(pokemon)}>
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
