import React from 'react'
import { Marker, Popup } from 'react-leaflet'
import PopupContent from './Popup'
import stopMarker from './stopMarker'
import questMarker from './questMarker'

const PokestopTile = ({
  pokestop, settings, availableForms, ts, globalFilters,
}) => (
  <Marker
    position={[pokestop.lat, pokestop.lon]}
    icon={stopMarker(pokestop, ts, globalFilters.pokestops)}
  >
    <Marker
      position={[pokestop.lat, pokestop.lon]}
      icon={questMarker(pokestop, settings, availableForms)}
    >
      <Popup position={[pokestop.lat, pokestop.lon]}>
        <PopupContent pokestop={pokestop} />
      </Popup>
    </Marker>
    <Popup position={[pokestop.lat, pokestop.lon]}>
      <PopupContent pokestop={pokestop} />
    </Popup>
  </Marker>

)

const areEqual = (prevStop, nextStop) => (
  prevStop.id === nextStop.id
  && prevStop.lat === nextStop.lat
  && prevStop.lon === nextStop.lon
)

export default React.memo(PokestopTile, areEqual)
