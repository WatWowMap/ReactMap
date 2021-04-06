/* eslint-disable arrow-body-style */
import React from 'react'
import { Marker, Popup } from 'react-leaflet'
import PopupContent from './Popup'
import marker from './marker'

const PokemonTile = ({ pokemon }) => {
  // console.log('rendered')
  return (
    <Marker
      position={[pokemon.lat, pokemon.lon]}
      icon={marker(pokemon, pokemon.form)}
    >
      <Popup position={[pokemon.lat, pokemon.lon]}>
        <PopupContent pokemon={pokemon} />
      </Popup>
    </Marker>
  )
}

const areEqual = (prevPoke, nextPoke) => {
  // console.log('memoized')
  return (
    prevPoke.id === nextPoke.id
    && prevPoke.lat === nextPoke.lat
    && prevPoke.lon === nextPoke.lon
  )
}

export default React.memo(PokemonTile, areEqual)
