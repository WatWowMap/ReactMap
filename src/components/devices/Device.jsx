import React from 'react'
import { Marker, Popup } from 'react-leaflet'
import { useQuery } from '@apollo/client'

import Query from '../../services/Query'
import marker from './marker'
import PopupContent from './Popup'

export default function Device() {
  const { data } = useQuery(Query.getAllDevices())

  return (
    <>
      {data && data.devices.map(device => (
        <Marker
          key={device.uuid}
          position={[device.last_lat, device.last_lon]}
          icon={marker(device)}
        >
          <Popup position={[device.last_lat, device.last_lon]}>
            <PopupContent device={device} />
          </Popup>
        </Marker>
      ))}
    </>
  )
}
