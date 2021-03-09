import React, { useState, useEffect } from 'react'
import { Marker, Popup } from 'react-leaflet'
import Fetch from '../../services/Fetch.js'
import MarkerIcon from './MarkerIcon.js'
import PopupContent from './Popup.jsx'
import MarkerClusterGroup from 'react-leaflet-markercluster'

const Gym = ({ bounds }) => {
  const [gyms, setGyms] = useState([])

  const getGyms = async (bounds) => {
    if (bounds) setGyms(await Fetch.fetchGyms(bounds))
  }

  useEffect(() => {
    getGyms(bounds)
  }, [bounds])

  const allGyms = gyms.map(gym => {
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
  })

  return (
    <MarkerClusterGroup>
      {allGyms}
    </MarkerClusterGroup>
  )
}

export default Gym