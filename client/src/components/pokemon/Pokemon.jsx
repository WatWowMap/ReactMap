import React from 'react'
import { Marker, Popup } from 'react-leaflet'
import MarkerIcon from './MarkerIcon.js'
import PopupContent from './Popup.jsx'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import { useQuery } from '@apollo/client'
import Query from '../../services/Query.js'

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
    <>
      {data && <MarkerClusterGroup
        disableClusteringAtZoom={16}
      >
        {data.pokemon.map(pokemon => {
          return (
            <Marker
              key={pokemon.id}
              position={[pokemon.lat, pokemon.lon]}
              icon={MarkerIcon(pokemon)}>
              <Popup position={[pokemon.lat, pokemon.lon]}>
                <PopupContent pokemon={pokemon} />
              </Popup>
            </Marker>
          )
        })}
      </MarkerClusterGroup>}
    </>
  )
}

export default Pokemon
