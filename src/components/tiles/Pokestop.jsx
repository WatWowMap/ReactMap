/* eslint-disable camelcase */
import React, {
  memo, useState, useEffect, useRef,
} from 'react'
import { Marker, Popup, Circle } from 'react-leaflet'

import PopupContent from '../popups/Pokestop'
import stopMarker from '../markers/pokestop'
import Timer from './Timer'

const PokestopTile = ({
  item, ts, showTimer, filters, Icons, perms, excludeList, userSettings,
  params, showCircles,
}) => {
  const [done, setDone] = useState(false)
  const markerRefs = useRef({})
  const {
    grunt_type, incident_expire_timestamp, quest_item_id, lure_expire_timestamp,
    quest_pokemon_id, quest_form_id, mega_amount, mega_pokemon_id, stardust_amount,
    ar_scan_eligible, candy_pokemon_id,
  } = item

  const hasLure = lure_expire_timestamp >= ts

  const hasInvasion = incident_expire_timestamp >= ts
    && !excludeList.includes(`i${grunt_type}`)

  const hasQuest = ((quest_item_id && !excludeList.includes(`q${quest_item_id}`))
    || (quest_pokemon_id && !excludeList.includes(`${quest_pokemon_id}-${quest_form_id}`))
    || (mega_amount && !excludeList.includes(`m${mega_pokemon_id}-${mega_amount}`))
    || (stardust_amount && !excludeList.includes(`d${stardust_amount}`))
    || (candy_pokemon_id && !excludeList.includes(`c${candy_pokemon_id}`)))

  useEffect(() => {
    const { id } = params
    if (id === item.id) {
      const markerToOpen = markerRefs.current[id]
      markerToOpen.openPopup()
    }
  }, [done])

  return (
    <>
      {(((hasQuest && perms.quests)
        || (hasLure && perms.lures)
        || (hasInvasion && perms.invasions))
        || ((filters.allPokestops || ar_scan_eligible) && perms.allPokestops))
        && (
          <Marker
            ref={(m) => {
              markerRefs.current[item.id] = m
              if (!done && item.id === params.id) {
                setDone(true)
              }
            }}
            position={[item.lat, item.lon]}
            icon={stopMarker(item, hasQuest, hasLure, hasInvasion, filters, Icons)}
          >
            <Popup position={[item.lat, item.lon]} onClose={() => delete params.id}>
              <PopupContent
                pokestop={item}
                ts={ts}
                hasLure={hasLure}
                hasInvasion={hasInvasion}
                hasQuest={hasQuest}
                Icons={Icons}
                userSettings={userSettings}
              />
            </Popup>
            {((showTimer || userSettings.invasionTimers) && hasInvasion)
              && (
                <Timer
                  timestamp={item.incident_expire_timestamp}
                  direction={hasLure ? 'right' : 'center'}
                  label={hasLure ? 'Invasion' : false}
                  offset={hasLure ? [-5, 20] : [0, 20]}
                />
              )}
            {((showTimer || userSettings.lureTimers) && hasLure)
              && (
                <Timer
                  timestamp={item.lure_expire_timestamp}
                  direction={hasInvasion ? 'left' : 'center'}
                  label={hasInvasion ? 'Lure' : false}
                  offset={hasInvasion ? [5, 20] : [0, 20]}
                />
              )}
            {showCircles && (
              <Circle
                center={[item.lat, item.lon]}
                radius={70}
                pathOptions={{ color: '#0DA8E7', weight: 1 }}
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
  && Object.keys(prev.userIcons).every(key => prev.userIcons[key] === next.userIcons[key])
  && Object.keys(prev.userSettings).every(key => prev.userSettings[key] === next.userSettings[key])
  && !next.excludeList.includes(`${prev.item.quest_pokemon_id}-${prev.item.quest_form_id}`)
  && !next.excludeList.includes(`i${prev.item.grunt_type}`)
  && !next.excludeList.includes(`m${prev.item.mega_pokemon_id}-${prev.item.mega_amount}`)
  && !next.excludeList.includes(`d${prev.item.stardust_amount}`)
  && !next.excludeList.includes(`q${prev.item.quest_item_id}`)
  && prev.showCircles === next.showCircles
)

export default memo(PokestopTile, areEqual)
