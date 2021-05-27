/* eslint-disable camelcase */
import React, { memo } from 'react'
import { Marker, Popup } from 'react-leaflet'

import PopupContent from '../popups/Pokestop'
import stopMarker from '../markers/pokestop'
import Timer from './Timer'

const PokestopTile = ({
  item, ts, showTimer, filters, iconSizes, path, availableForms, perms, excludeList,
}) => {
  const {
    grunt_type, incident_expire_timestamp, quest_item_id, lure_expire_timestamp,
    quest_pokemon_id, quest_form_id, mega_amount, mega_pokemon_id, stardust_amount,
  } = item

  const hasLure = lure_expire_timestamp >= ts

  const hasInvasion = incident_expire_timestamp >= ts
    && !excludeList.includes(`i${grunt_type}`)

  const hasQuest = ((quest_item_id && !excludeList.includes(`q${quest_item_id}`))
    || (item.quest_pokemon_id && !excludeList.includes(`${quest_pokemon_id}-${quest_form_id}`))
    || (item.mega_amount && !excludeList.includes(`${mega_pokemon_id}-${mega_amount}`))
    || (item.stardust_amount && !excludeList.includes(`d${stardust_amount}`)))

  return (
    <>
      {(((hasQuest && perms.quests)
        || (hasLure && perms.lures)
        || (hasInvasion && perms.invasions))
        || (filters.allPokestops && perms.allPokestops))
        && (
          <Marker
            position={[item.lat, item.lon]}
            icon={stopMarker(item, hasQuest, hasLure, hasInvasion, filters, iconSizes, path, availableForms)}
          >
            <Popup position={[item.lat, item.lon]}>
              <PopupContent
                pokestop={item}
                ts={ts}
                hasLure={hasLure}
                hasInvasion={hasInvasion}
                hasQuest={hasQuest}
                path={path}
                availableForms={availableForms}
              />
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
        )}
    </>
  )
}

const areEqual = (prev, next) => (
  prev.item.id === next.item.id
  && prev.item.lure_expire_timestamp === next.item.lure_expire_timestamp
  && prev.item.quest_item_id === next.item.quest_item_id
  && prev.item.quest_pokemon_id === next.item.quest_pokemon_id
  && prev.item.mega_pokemon_id === next.item.mega_pokemon_id
  && prev.item.incident_expire_timestamp === next.item.incident_expire_timestamp
  && prev.item.stardust_amount === next.item.stardust_amount
  && prev.item.updated === next.item.updated
  && prev.showTimer === next.showTimer
  && prev.filters.filter[prev.item.key || 's0'].size === next.filters.filter[next.item.key || 's0'].size
  && !next.excludeList.includes(`${prev.item.quest_pokemon_id}-${prev.item.quest_form_id}`)
  && !next.excludeList.includes(`i${prev.item.grunt_type}`)
  && !next.excludeList.includes(`m${prev.item.mega_pokemon_id}-${prev.item.mega_amount}`)
  && !next.excludeList.includes(`d${prev.item.stardust_amount}`)
  && !next.excludeList.includes(`q${prev.item.quest_item_id}`)
)

export default memo(PokestopTile, areEqual)
