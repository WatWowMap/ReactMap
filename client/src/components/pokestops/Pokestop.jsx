import React, { useState, useEffect } from 'react'
import { Marker, Popup } from 'react-leaflet'
import Fetch from '../../services/Fetch.js'
import MarkerIcon from './MarkerIcon.js'
import PopupContent from './Popup.jsx'
import MarkerClusterGroup from 'react-leaflet-markercluster'

const Pokestop = ({ bounds }) => {
  const [pokestops, setPokestops] = useState([])

  const getPokestops = async (bounds) => {
    if (bounds) setPokestops(await Fetch.fetchPokestops(bounds))
  }

  useEffect(() => {
    getPokestops(bounds)
  }, [bounds])

  const allPokestops = pokestops.map(pokestop => {
    return (
      <Marker
        key={pokestop.id}
        position={[pokestop.lat, pokestop.lon]}
        icon={MarkerIcon(pokestop)}>
        <Popup position={[pokestop.lat, pokestop.lon]}>
          <PopupContent pokestop={pokestop} />
        </Popup>
      </Marker>
    )
  })

  return (
    <MarkerClusterGroup
      disableClusteringAtZoom={16}
    >
      {allPokestops}
    </MarkerClusterGroup>
  )
}

export default Pokestop