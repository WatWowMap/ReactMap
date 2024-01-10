/* eslint-disable react/destructuring-assignment */
// @ts-check
import * as React from 'react'
import { Popup, Polyline, Marker } from 'react-leaflet'

import { basicEqualFn, useMemory } from '@hooks/useMemory'
import { useStorage } from '@hooks/useStorage'

import weatherMarker from '../markers/weather'
import PopupContent from '../popups/Weather'

/**
 *
 * @param {import('@rm/types').Weather} weather
 * @returns
 */
const WeatherTile = (weather) => {
  const [popup, setPopup] = React.useState(false)
  const markerRef = React.useRef(null)

  const [darkTiles, iconUrl] = useMemory(
    (s) => [
      s.tileStyle === 'dark',
      s.Icons.getWeather(weather.gameplay_condition, s.timeOfDay),
    ],
    basicEqualFn,
  )
  const color = useStorage((s) =>
    darkTiles
      ? s.userSettings.weather.darkMapBorder
      : s.userSettings.weather.lightMapBorder,
  )
  React.useEffect(() => {
    if (popup && markerRef) {
      markerRef.current.openPopup()
    }
  })

  /** @type {import('react-leaflet').MarkerProps['eventHandlers']} */
  const eventHandlers = React.useMemo(
    () => ({
      popupclose: () => setPopup(false),
      popupopen: () => setPopup(true),
    }),
    [],
  )

  return (
    <Polyline
      key={color}
      positions={weather.polygon}
      color={color}
      opacity={0.25}
    >
      <Marker
        ref={markerRef}
        icon={weatherMarker(iconUrl)}
        position={[weather.latitude, weather.longitude]}
        zIndexOffset={10000}
        eventHandlers={eventHandlers}
      >
        <Popup position={[weather.latitude, weather.longitude]}>
          <PopupContent {...weather} />
        </Popup>
      </Marker>
    </Polyline>
  )
}

const MemoWeatherTile = React.memo(
  WeatherTile,
  (prev, next) =>
    prev.gameplay_condition === next.gameplay_condition &&
    prev.updated === next.updated,
)

export default MemoWeatherTile
