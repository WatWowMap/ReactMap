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
    {(pokestop.quest_rewards || pokestop.quest_pokemon_id)
      && (
        <Marker
          position={[pokestop.lat, pokestop.lon]}
          icon={questMarker(pokestop, settings, availableForms)}
        >
          <Popup position={[pokestop.lat, pokestop.lon]}>
            <PopupContent pokestop={pokestop} />
          </Popup>
        </Marker>
      )}
    <Popup position={[pokestop.lat, pokestop.lon]}>
      <PopupContent pokestop={pokestop} />
    </Popup>
  </Marker>

)

const areEqual = (prev, next) => (
  prev.pokestop.id === next.pokestop.id
    && prev.pokestop.updated === next.pokestop.updated

)

export default React.memo(PokestopTile, areEqual)
