import React, { memo, useState, useRef, useEffect } from 'react'
import { Popup, Polyline, Marker } from 'react-leaflet'

import weatherMarker from '../markers/weather'
import PopupContent from '../popups/Weather'

const WeatherTile = ({ item, ts, Icons, isNight, tileStyle, userSettings }) => {
  const [popup, setPopup] = useState(false)
  const markerRef = useRef(null)

  useEffect(() => {
    if (popup && markerRef) {
      markerRef.current.openPopup()
    }
  })

  return (
    <Polyline
      key={item.id}
      positions={item.polygon}
      pathOptions={{ color: tileStyle === 'dark' ? userSettings.darkMapBorder : userSettings.lightMapBorder, opacity: 0.25 }}
    >
      <Marker
        icon={weatherMarker(item, Icons, isNight, userSettings)}
        position={[item.latitude, item.longitude]}
        zIndexOffset={10000}
        ref={markerRef}
      >
        <Popup
          position={[item.latitude, item.longitude]}
          onOpen={() => setPopup(true)}
          onClose={() => setPopup(false)}
        >
          <PopupContent weather={item} ts={ts} Icons={Icons} />
        </Popup>
      </Marker>
    </Polyline>
  )
}

const areEqual = (prev, next) => (
  prev.item.gameplay_condition === next.item.gameplay_condition
  && prev.item.updated === next.item.updated
  && prev.tileStyle === next.tileStyle
)

export default memo(WeatherTile, areEqual)
