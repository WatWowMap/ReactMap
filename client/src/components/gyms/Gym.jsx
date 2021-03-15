import React from 'react'
import { Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-markercluster'

import { useQuery } from '@apollo/client'
import Query from '../../services/Query.js'

import marker from './marker.js'
import PopupContent from './Popup.jsx'

const Gym = ({ bounds }) => {
  const { loading, error, data } = useQuery(Query.getAllGyms(), {
    variables: bounds
  })

  return (
    <MarkerClusterGroup
      disableClusteringAtZoom={16}
    >
      {data && data.gyms.map(gym => {
        return (
          <Marker
            key={gym.id}
            position={[gym.lat, gym.lon]}
            icon={marker(gym)}>
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
