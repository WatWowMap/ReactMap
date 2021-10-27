import React from 'react'
import { Popup, Polyline, Marker } from 'react-leaflet'

import weatherMarker from '../markers/weather'
import PopupContent from '../popups/Weather'

export default function WeatherTile({ item, ts, Icons }) {
  return (
    <Polyline
      key={item.id}
      positions={item.polygon}
      pathOptions={{ color: '#246377', opacity: 0.25 }}
    >
      <Marker
        icon={weatherMarker(item, Icons)}
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
