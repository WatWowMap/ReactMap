import React from 'react'
import { Marker, Popup } from 'react-leaflet'
import MarkerIcon from './MarkerIcon.js'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import PopupContent from './Popup.jsx'
import { useQuery } from '@apollo/client'
import Query from '../../services/Query.js'

const Gym = ({ bounds }) => {
  const { loading, error, data } = useQuery(Query.getAllGyms(), {
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
      {data && data.gyms.map(gym => {
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
