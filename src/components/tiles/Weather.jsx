import React from 'react'
import { Popup, Polyline, Marker } from 'react-leaflet'

import weatherMarker from '../markers/weather'
import PopupContent from '../popups/Weather'

export default function WeatherTile({ item, ts, Icons, isNight, tileStyle }) {
  return (
    <Polyline
      key={item.id}
      positions={item.polygon}
      pathOptions={{ color: tileStyle === 'light' ? '#246377' : 'red', opacity: 0.25 }}
    >
      <Marker
        icon={weatherMarker(item, Icons, isNight)}
        position={[item.latitude, item.longitude]}
        zIndexOffset={10000}
      >
        <Popup position={[item.latitude, item.longitude]}>
          <PopupContent weather={item} ts={ts} Icons={Icons} />
        </Popup>
      </Marker>
    </Polyline>
  )
}
