import React from 'react'
import { Popup, Polyline, Marker } from 'react-leaflet'
import weatherMarker from '../markers/weather'
import PopupContent from '../popups/Weather'

export default function WeatherTile({ item }) {
  return (
    <Polyline
      key={item.id}
      positions={item.polygon}
      pathOptions={{ color: 'green', opacity: 0.5 }}
    >
      <Marker icon={weatherMarker(item)} position={[item.latitude, item.longitude]}>
        <Popup position={[item.latitude, item.longitude]}>
          <PopupContent weather={item} />
        </Popup>
      </Marker>
    </Polyline>
  )
}
