import React, { memo, useState, useRef, useEffect } from 'react'
import { Marker, Popup, Circle } from 'react-leaflet'

import useMarkerTimer from '@hooks/useMarkerTimer'
import useForcePopup from '@hooks/useForcePopup'

import gymMarker from '../markers/gym'
import PopupContent from '../popups/Gym'
import ToolTipWrapper from './Timer'

const getColor = (team) => {
  switch (team) {
    case 1:
      return '#0030C8'
    case 2:
      return '#D83C22'
    case 3:
      return '#F1F642'
    default:
      return '#A9A9A9'
  }
}

const GymTile = ({
  item,
  ts,
  showTimer,
  filters,
  Icons,
  excludeList,
  userSettings,
  params,
  showCircles,
  setParams,
  config,
  zoom,
}) => {
  const markerRef = useRef({})
  const [done, setDone] = useState(false)
  const [stateChange, setStateChange] = useState(false)
  const [badge, setBadge] = useState(item.badge || 0)

  const {
    raid_battle_timestamp,
    raid_end_timestamp,
    raid_level,
    raid_pokemon_id,
    raid_pokemon_form,
    team_id,
  } = item
  const newTs = Date.now() / 1000
  const hasRaid =
    raid_end_timestamp >= newTs &&
    raid_level > 0 &&
    (raid_battle_timestamp >= newTs
      ? !excludeList.includes(`e${raid_level}`)
      : !excludeList.includes(`${raid_pokemon_id}-${raid_pokemon_form}`))

  const hasHatched =
    raid_end_timestamp >= newTs && raid_battle_timestamp <= newTs

  const timerToDisplay =
    item.raid_pokemon_id || hasHatched
      ? raid_end_timestamp
      : raid_battle_timestamp

  useMarkerTimer(timerToDisplay, item.id, markerRef, '', ts, () =>
    setStateChange(!stateChange),
  )
  useForcePopup(item.id, markerRef, params, setParams, done)

  useEffect(() => {
    if (filters.gymBadges) {
      setBadge(item.badge || 0)
    } else {
      setBadge(0)
    }
  }, [filters.gymBadges, item.badge])

  return (
    !excludeList.includes(`t${team_id}-0`) && (
      <Marker
        ref={(m) => {
          markerRef.current[item.id] = m
          if (!done && item.id === params.id) {
            setDone(true)
          }
        }}
        position={[item.lat, item.lon]}
        icon={gymMarker(
          item,
          hasHatched,
          hasRaid,
          filters,
          Icons,
          userSettings,
          badge,
        )}
      >
        <Popup position={[item.lat, item.lon]}>
          <PopupContent
            gym={item}
            hasRaid={hasRaid}
            hasHatched={hasHatched}
            ts={ts}
            Icons={Icons}
            badge={badge}
            setBadge={setBadge}
          />
        </Popup>
        {(showTimer || userSettings.raidTimers) && hasRaid && (
          <ToolTipWrapper timers={[timerToDisplay]} offset={[0, 5]} />
        )}
        {showCircles && (
          <Circle
            center={[item.lat, item.lon]}
            radius={80}
            pathOptions={{ color: getColor(item.team_id), weight: 1 }}
          />
        )}
        {userSettings['300mRange'] && zoom >= config.interactionRangeZoom && (
          <Circle
            center={[item.lat, item.lon]}
            radius={300}
            pathOptions={{ color: getColor(item.team_id), weight: 0.5 }}
          />
        )}
        {!!userSettings.customRange && zoom >= config.interactionRangeZoom && (
          <Circle
            center={[item.lat, item.lon]}
            radius={userSettings.customRange}
            pathOptions={{ color: getColor(item.team_id), weight: 0.5 }}
          />
        )}
      </Marker>
    )
  )
}

const areEqual = (prev, next) => {
  const raidLogic = () => {
    if (
      prev.item.raid_battle_timestamp <= next.ts &&
      prev.item.raid_battle_timestamp > prev.ts
    ) {
      return false
    }
    if (
      prev.item.raid_end_timestamp <= next.ts &&
      prev.item.raid_end_timestamp > prev.ts
    ) {
      return false
    }
    return true
  }

  return (
    prev.item.id === next.item.id &&
    prev.item.raid_pokemon_id === next.item.raid_pokemon_id &&
    prev.item.raid_level === next.item.raid_level &&
    prev.item.in_battle === next.item.in_battle &&
    prev.item.badge === next.item.badge &&
    prev.item.team_id === next.item.team_id &&
    prev.item.available_slots === next.item.available_slots &&
    raidLogic() &&
    prev.showTimer === next.showTimer &&
    prev.showCircles === next.showCircles &&
    !next.excludeList.includes(
      `${prev.item.raid_pokemon_id}-${prev.item.raid_pokemon_form}`,
    ) &&
    !next.excludeList.includes(`t${prev.item.team_id}-0`) &&
    !next.excludeList.includes(`e${prev.item.raid_level}`)
  )
}

export default memo(GymTile, areEqual)
