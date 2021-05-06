import React, { memo } from 'react'
import { Marker, Popup } from 'react-leaflet'
import PopupContent from '../popups/Pokestop'
import stopMarker from '../markers/pokestop'
import questMarker from '../markers/quest'

const PokestopTile = ({ item, ts }) => (
  <Marker
    position={[item.lat, item.lon]}
    icon={stopMarker(item, ts)}
  >
    {(item.quest_rewards || item.quest_pokemon_id)
      && (
        <Marker
          position={[item.lat, item.lon]}
          icon={questMarker(item)}
        >
          <Popup position={[item.lat, item.lon]}>
            <PopupContent pokestop={item} />
          </Popup>
        </Marker>
      )}
    <Popup position={[item.lat, item.lon]}>
      <PopupContent pokestop={item} />
    </Popup>
  </Marker>

)

const areEqual = (prev, next) => (
  prev.item.id === next.item.id
  && prev.item.lure_expire_timestamp === next.item.lure_expire_timestamp
  && prev.item.quest_rewards === next.item.quest_rewards
  && prev.item.quest_pokemon_id === next.item.quest_pokemon_id
  && prev.item.incident_expire_timestamp === next.item.incident_expire_timestamp
  && prev.item.updated === next.item.updated
)

export default memo(PokestopTile, areEqual)
