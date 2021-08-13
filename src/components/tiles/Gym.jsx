/* eslint-disable camelcase */
import React, {
  memo, useState, useEffect, useRef,
} from 'react'
import { Marker, Popup, Circle } from 'react-leaflet'

import gymMarker from '../markers/gym'
import PopupContent from '../popups/Gym'
import Timer from './Timer'

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
  showCircles,
}) => {
  const [done, setDone] = useState(false)
  const markerRefs = useRef({})
  const {
    raid_battle_timestamp, raid_end_timestamp, raid_level, raid_pokemon_id, raid_pokemon_form, team_id,
  } = item
  const hasRaid = (raid_end_timestamp >= ts
    && raid_level > 0
    && (raid_battle_timestamp >= ts
      ? !excludeList.includes(`e${raid_level}`)
      : !excludeList.includes(`${raid_pokemon_id}-${raid_pokemon_form}`)))
  const hasEgg = (raid_end_timestamp >= ts && raid_battle_timestamp <= ts)
  const timerToDisplay = raid_battle_timestamp >= ts && !raid_pokemon_id ? raid_battle_timestamp : raid_end_timestamp

  useEffect(() => {
    const { id } = params
    if (id === item.id) {
      const markerToOpen = markerRefs.current[id]
      markerToOpen.openPopup()
    }
  }, [done])

  return (
    <>
      {!excludeList.includes(`t${team_id}-0`) && (
        <Marker
          ref={(m) => {
            markerRefs.current[item.id] = m
            if (!done && item.id === params.id) {
              setDone(true)
            }
          }}
          position={[item.lat, item.lon]}
          icon={gymMarker(item, hasEgg, hasRaid, filters, Icons, userSettings)}
        >
          <Popup position={[item.lat, item.lon]} onClose={() => delete params.id}>
            <PopupContent
              gym={item}
              hasRaid={hasRaid}
              ts={ts}
              Icons={Icons}
            />
          </Popup>
          {((showTimer || userSettings.raidTimers) && hasRaid) && (
            <Timer
              timestamp={timerToDisplay}
              direction="center"
              offset={[0, 10]}
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
      )}
    </>
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
  return (
    prev.item.id === next.item.id
    && prev.item.updated === next.item.updated
    && prev.item.raid_pokemon_id === next.item.raid_pokemon_id
    && raidLogic()
    && sizeLogic()
    && prev.showTimer === next.showTimer
    && prev.item.team_id === next.item.team_id
    && !next.excludeList.includes(`${prev.item.raid_pokemon_id}-${prev.item.raid_pokemon_form}`)
    && !next.excludeList.includes(`t${prev.item.team_id}-0`)
    && !next.excludeList.includes(`e${prev.item.raid_level}`)
    && Object.keys(prev.userIcons).every(key => prev.userIcons[key] === next.userIcons[key])
    && Object.keys(prev.userSettings).every(key => prev.userSettings[key] === next.userSettings[key])
    && prev.showCircles === next.showCircles
  )
}

export default memo(GymTile, areEqual)
