import React from 'react'
import { Marker, Popup } from 'react-leaflet'
import MarkerIcon from './MarkerIcon.js'
import PopupContent from './Popup.jsx'
import { useQuery } from '@apollo/client'
import Query from '../../services/Query.js'

const Device = () => {
  const { loading, error, data } = useQuery(Query.getAllDevices())

  return (
    <>
      {data && data.devices.map(device => {
        return (
          <Marker
            key={device.uuid}
            position={[device.last_lat, device.last_lon]}
            icon={MarkerIcon(device)}>
            <Popup position={[device.last_lat, device.last_lon]}>
              <PopupContent device={device} />
            </Popup>
          </Marker>
        )
      })}
    </>
  )
}

export default Device
