import React from 'react'
import { Marker, Popup } from 'react-leaflet'
import deviceMarker from '../markers/device'
import PopupContent from '../popups/Device'

export default function DeviceTile({ item, ts }) {
  return (
    <Marker
      position={[item.last_lat, item.last_lon]}
      icon={deviceMarker(item, ts)}
    >
      <Popup position={[item.last_lat, item.last_lon]}>
        <PopupContent device={item} />
      </Popup>
    </Marker>
  )
}
