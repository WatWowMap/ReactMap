import React, { memo } from 'react'
import { Marker, Popup } from 'react-leaflet'
import PopupContent from '../popups/Pokestop'
import stopMarker from '../markers/pokestop'
import Timer from './Timer'

const PokestopTile = ({ item, ts, showTimer }) => {
  const hasInvasion = item.incident_expire_timestamp >= ts
  const hasLure = item.lure_expire_timestamp >= ts
  const hasQuest = item.quest_reward_type

  return (
    <Marker
      position={[item.lat, item.lon]}
      icon={stopMarker(item, ts, hasQuest, hasLure, hasInvasion)}
    >
      <Popup position={[item.lat, item.lon]}>
        <PopupContent pokestop={item} ts={ts} hasLure={hasLure} hasInvasion={hasInvasion} />
      </Popup>
      {(showTimer && hasInvasion)
        && (
          <Timer
            timestamp={item.incident_expire_timestamp}
            direction={hasLure ? 'right' : 'center'}
            label={hasLure ? 'Invasion' : false}
          />
        )}
      {(showTimer && hasLure)
        && (
        <Timer
          timestamp={item.lure_expire_timestamp}
          direction={hasInvasion ? 'left' : 'center'}
          label={hasInvasion ? 'Lure' : false}
        />
        )}
    </Marker>
  )
}

const areEqual = (prev, next) => (
  prev.item.id === next.item.id
  && prev.item.lure_expire_timestamp === next.item.lure_expire_timestamp
  && prev.item.quest_rewards === next.item.quest_rewards
  && prev.item.quest_pokemon_id === next.item.quest_pokemon_id
  && prev.item.mega_pokemon_id === next.item.mega_pokemon_id
  && prev.item.incident_expire_timestamp === next.item.incident_expire_timestamp
  && prev.item.updated === next.item.updated
  && prev.showTimer === next.showTimer
)

export default memo(PokestopTile, areEqual)
