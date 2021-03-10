import React from 'react'
import { Marker, Popup } from 'react-leaflet'
import MarkerIcon from './MarkerIcon.js'
import PopupContent from './Popup.jsx'
import MarkerClusterGroup from 'react-leaflet-markercluster'

const Pokestop = ({ data }) => {
  return (
    <MarkerClusterGroup
      disableClusteringAtZoom={16}
    >
      {data.map(pokestop => {
        return (
          <Marker
            key={pokestop.id}
            position={[pokestop.lat, pokestop.lon]}
            icon={MarkerIcon(pokestop)}>
            <Popup position={[pokestop.lat, pokestop.lon]}>
              <PopupContent gym={pokestop} />
            </Popup>
          </Marker>
        )
      })}
    </MarkerClusterGroup>
  )
}

export default Pokestop