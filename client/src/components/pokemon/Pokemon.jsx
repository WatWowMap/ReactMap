import React, { useState, useEffect } from 'react'
import { Marker, Popup } from 'react-leaflet'
import Fetch from '../../services/Fetch.js'
import MarkerIcon from './MarkerIcon.js'
import PopupContent from './Popup.jsx'
import MarkerClusterGroup from 'react-leaflet-markercluster'

const Pokemon = ({ data }) => {
  return (
    <MarkerClusterGroup
      disableClusteringAtZoom={16}
    >
      {data.map(pokemon => {
        return (
          <Marker
            key={pokemon.id}
            position={[pokemon.lat, pokemon.lon]}
            icon={MarkerIcon(pokemon)}>
            <Popup position={[pokemon.lat, pokemon.lon]}>
              <PopupContent gym={pokemon} />
            </Popup>
          </Marker>
        )
      })}
    </MarkerClusterGroup>
  )
}

export default Pokemon