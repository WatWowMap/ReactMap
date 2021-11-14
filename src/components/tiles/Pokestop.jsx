/* eslint-disable camelcase */
import React, { useState, memo, useRef } from 'react'
import { Marker, Popup, Circle } from 'react-leaflet'

import useMarkerTimer from '@hooks/useMarkerTimer'
import useForcePopup from '@hooks/useForcePopup'

import PopupContent from '../popups/Pokestop'
import stopMarker from '../markers/pokestop'
import ToolTipWrapper from './Timer'

const PokestopTile = ({
  item, ts, showTimer, filters, Icons, perms, excludeList, userSettings,
  params, showCircles, config, setParams,
}) => {
  const markerRef = useRef({})
  const [done, setDone] = useState(false)
  const [stateChange, setStateChange] = useState(false)
  const newTs = Date.now() / 1000

  const hasLure = item.lure_expire_timestamp > newTs

  const hasInvasion = item.invasions && item.invasions.some(invasion => !excludeList.includes(`i${invasion.grunt_type}`) && invasion.incident_expire_timestamp > newTs)

  const hasQuest = item.quests && item.quests.some(quest => !excludeList.includes(quest.key))

  const timers = []
  if ((showTimer || userSettings.invasionTimers) && hasInvasion) {
    item.invasions.forEach(invasion => (
      timers.push(invasion.incident_expire_timestamp)
    ))
  }
  if ((showTimer || userSettings.lureTimers) && hasLure) {
    timers.push(item.lure_expire_timestamp)
  }

  useMarkerTimer(timers.length ? Math.min(...timers) : null, item.id, markerRef, '', ts, () => setStateChange(!stateChange))
  useForcePopup(item.id, markerRef, params, setParams, done)

  return Boolean(((hasQuest && perms.quests)
    || (hasLure && perms.lures)
    || (hasInvasion && perms.invasions))
    || ((filters.allPokestops || item.ar_scan_eligible) && perms.allPokestops))
    && (
      <Marker
        ref={(m) => {
          markerRef.current[item.id] = m
          if (!done && item.id === params.id) {
            setDone(true)
          }
        }}
        position={[item.lat, item.lon]}
        icon={stopMarker(item, hasQuest, hasLure, hasInvasion, filters, Icons, userSettings)}
      >
        <Popup position={[item.lat, item.lon]}>
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
        {Boolean(timers.length) && (
          <ToolTipWrapper timers={timers} offset={[6, 4]} />
        )}
        {showCircles && (
          <Circle
            center={[item.lat, item.lon]}
            radius={70}
            pathOptions={{ color: '#0DA8E7', weight: 1 }}
          />
        )}
      </Marker>
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
