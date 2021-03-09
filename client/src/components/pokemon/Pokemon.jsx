import React, { useState, useEffect } from 'react'
import { Marker, Popup } from 'react-leaflet'
import Fetch from '../../services/Fetch.js'
import MarkerIcon from './MarkerIcon.js'
import PopupContent from './Popup.jsx'
import MarkerClusterGroup from 'react-leaflet-markercluster'

const Pokemon = ({ bounds }) => {
  const [pokemon, setPokemon] = useState([])

  const getPokemon = async (bounds) => {
    if (bounds) setPokemon(await Fetch.fetchPokemon(bounds))
  }

  useEffect(() => {
    getPokemon(bounds)
  }, [bounds])

  const allPokemon = pokemon.map(pokemon => {
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
  })

  return (
    <MarkerClusterGroup
    disableClusteringAtZoom={16}
    >
      {allPokemon}
    </MarkerClusterGroup>
  )
}

export default Pokemon