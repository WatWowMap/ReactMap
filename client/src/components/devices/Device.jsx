import React from 'react'
import { Marker, Popup } from 'react-leaflet'

import { useQuery } from '@apollo/client'
import Query from '../../services/Query.js'

import marker from './marker.js'
import PopupContent from './Popup.jsx'

const Device = () => {
  const { loading, error, data } = useQuery(Query.getAllDevices())

  return (
    <>
      {data && data.devices.map(device => {
        return (
          <Marker
            key={device.uuid}
            position={[device.last_lat, device.last_lon]}
            icon={marker(device)}>
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
