import React, { useState, useEffect } from 'react'
import { Marker, Popup } from 'react-leaflet'
import MarkerIcon from './MarkerIcon.js'
import PopupContent from './Popup.jsx'
import MarkerClusterGroup from 'react-leaflet-markercluster'

const Gym = ({ data }) => {
  return (
    <MarkerClusterGroup
      disableClusteringAtZoom={16}
    >
      {data.map(gym => {
        return (
          <Marker
            key={gym.id}
            position={[gym.lat, gym.lon]}
            icon={MarkerIcon(gym)}>
            <Popup position={[gym.lat, gym.lon]}>
              <PopupContent gym={gym} />
            </Popup>
          </Marker>
        )
      })}
    </MarkerClusterGroup>
  )
}

export default Gym