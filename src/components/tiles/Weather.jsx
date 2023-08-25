/* eslint-disable react/destructuring-assignment */
// @ts-check
import * as React from 'react'
import { Popup, Polyline, Marker } from 'react-leaflet'

import { basicEqualFn, useStatic, useStore } from '@hooks/useStore'

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

  const [darkTiles, iconUrl] = useStatic(
    (s) => [
      s.tileStyle === 'dark',
      s.Icons.getWeather(weather.gameplay_condition, s.timeOfDay),
    ],
    basicEqualFn,
  )
  const color = useStore((s) =>
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

const MemoWeatherTile = React.memo(WeatherTile, () => true)

export default MemoWeatherTile
