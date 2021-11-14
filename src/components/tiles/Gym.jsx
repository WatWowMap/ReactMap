/* eslint-disable camelcase */
import React, { memo, useState, useRef } from 'react'
import { Marker, Popup, Circle } from 'react-leaflet'

import useMarkerTimer from '@hooks/useMarkerTimer'
import useForcePopup from '@hooks/useForcePopup'

import gymMarker from '../markers/gym'
import PopupContent from '../popups/Gym'
import ToolTipWrapper from './Timer'

const getColor = team => {
  switch (team) {
    default: return '#A9A9A9'
    case 1: return '#0030C8'
    case 2: return '#D83C22'
    case 3: return '#F1F642'
  }
}

const GymTile = ({
  item, ts, showTimer, filters, Icons, excludeList, userSettings, params,
  showCircles, setParams,
}) => {
  const markerRef = useRef({})
  const [done, setDone] = useState(false)
  const [stateChange, setStateChange] = useState(false)

  const {
    raid_battle_timestamp, raid_end_timestamp, raid_level, raid_pokemon_id, raid_pokemon_form, team_id,
  } = item
  const newTs = Date.now() / 1000
  const hasRaid = raid_end_timestamp >= newTs
    && raid_level > 0
    && (raid_battle_timestamp >= newTs
      ? !excludeList.includes(`e${raid_level}`)
      : !excludeList.includes(`${raid_pokemon_id}-${raid_pokemon_form}`))

  const hasHatched = raid_end_timestamp >= newTs && raid_battle_timestamp <= newTs

  const timerToDisplay = hasHatched ? raid_end_timestamp : raid_battle_timestamp

  useMarkerTimer(timerToDisplay, item.id, markerRef, '', ts, () => setStateChange(!stateChange))
  useForcePopup(item.id, markerRef, params, setParams, done)

  return !excludeList.includes(`t${team_id}-0`) && (
    <Marker
      ref={(m) => {
        markerRef.current[item.id] = m
        if (!done && item.id === params.id) {
          setDone(true)
        }
      }}
      position={[item.lat, item.lon]}
      icon={gymMarker(item, hasHatched, hasRaid, filters, Icons, userSettings)}
    >
      <Popup position={[item.lat, item.lon]}>
        <PopupContent
          gym={item}
          hasRaid={hasRaid}
          hasHatched={hasHatched}
          ts={ts}
          Icons={Icons}
        />
      </Popup>
      {((showTimer || userSettings.raidTimers) && hasRaid) && (
        <ToolTipWrapper
          timers={[timerToDisplay]}
          offset={[6, 5]}
        />
      )}
      {showCircles && (
        <Circle
          center={[item.lat, item.lon]}
          radius={70}
          pathOptions={{ color: getColor(item.team_id), weight: 1 }}
        />
      )}
    </Marker>
  )
}

const areEqual = (prev, next) => {
  const raidLogic = () => {
    if (prev.item.raid_battle_timestamp <= next.ts
      && prev.item.raid_battle_timestamp > prev.ts) {
      return false
    }
    if (prev.item.raid_end_timestamp <= next.ts
      && prev.item.raid_end_timestamp > prev.ts) {
      return false
    }
    return true
  }

  const sizeLogic = () => {
    let filterId = `g${prev.item.team_id}-${6 - prev.item.availble_slots}`
    if (prev.item.team_id == 0) {
      filterId = `t${prev.item.team_id}-0`
    }
    let firstCheck = true
    if (prev.team_id) {
      firstCheck = prev.filters.filter[filterId].size === next.filters.filter[filterId].size
    }
    if (prev.item.raid_end_timestamp >= prev.ts && next.item.raid_end_timestamp >= next.ts) {
      if (prev.item.raid_pokemon_id > 0 && next.item.raid_pokemon_id > 0) {
        return firstCheck && prev.filters.filter[`${prev.item.raid_pokemon_id}-${prev.item.raid_pokemon_form}`].size === next.filters.filter[`${next.item.raid_pokemon_id}-${next.item.raid_pokemon_form}`].size
      }
      return firstCheck && prev.filters.filter[`e${prev.item.raid_level}`].size === next.filters.filter[`e${next.item.raid_level}`].size
    }
    return firstCheck
  }
  return prev.item.id === next.item.id
    && prev.item.raid_pokemon_id === next.item.raid_pokemon_id
    && prev.item.raid_level === next.item.raid_level
    && prev.item.in_battle === next.item.in_battle
    && raidLogic()
    && sizeLogic()
    && prev.showTimer === next.showTimer
    && prev.item.team_id === next.item.team_id
    && prev.item.availble_slots === next.item.availble_slots
    && !next.excludeList.includes(`${prev.item.raid_pokemon_id}-${prev.item.raid_pokemon_form}`)
    && !next.excludeList.includes(`t${prev.item.team_id}-0`)
    && !next.excludeList.includes(`e${prev.item.raid_level}`)
    && Object.keys(prev.userIcons).every(key => prev.userIcons[key] === next.userIcons[key])
    && Object.keys(prev.userSettings).every(key => prev.userSettings[key] === next.userSettings[key])
    && prev.showCircles === next.showCircles
}

export default memo(GymTile, areEqual)
