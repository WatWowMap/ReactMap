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
  params, showCircles, config,
}) => {
  const [done, setDone] = useState(false)
  const markerRefs = useRef({})

  const {
    lure_expire_timestamp, ar_scan_eligible, quests, invasions,
  } = item

  const hasLure = lure_expire_timestamp >= ts
  const hasInvasion = invasions && invasions.some(invasion => !excludeList.includes(`i${invasion.grunt_type}`))
  const hasQuest = quests && quests.some(quest => !excludeList.includes(quest.key))

  useEffect(() => {
    const { id } = params
    if (id === item.id) {
      const markerToOpen = markerRefs.current[id]
      markerToOpen.openPopup()
    }
  }, [done])

  return (
    <>
      {Boolean(((hasQuest && perms.quests)
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
                config={config}
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
  && prev.item.quests?.length === next.item.quests?.length
  && prev.item.invasions?.length === next.item.invasions?.length
  && prev.item.updated === next.item.updated
  && prev.showTimer === next.showTimer
  && Object.keys(prev.userIcons).every(key => prev.userIcons[key] === next.userIcons[key])
  && Object.keys(prev.userSettings).every(key => prev.userSettings[key] === next.userSettings[key])
  && (prev.item.quests
    ? !prev.item.quests.some(quest => next.excludeList.includes(quest.key))
    : true)
  && (prev.item.invasions
    ? !prev.item.invasions.some(invasion => next.excludeList.includes(invasion.grunt_type))
    : true)
  && prev.showCircles === next.showCircles
)

export default memo(PokestopTile, areEqual)
