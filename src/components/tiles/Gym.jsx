/* eslint-disable camelcase */
import React, { memo } from 'react'
import { Marker, Popup } from 'react-leaflet'
import gymMarker from '../markers/gym'
import raidMarker from '../markers/raid'
import PopupContent from '../popups/Gym'
import Timer from './Timer'

const GymTile = ({ item, ts, showTimer }) => {
  const { raid_battle_timestamp, raid_end_timestamp, raid_level } = item
  const hasRaid = (raid_end_timestamp >= ts && raid_level > 0)
  const timerToDisplay = raid_battle_timestamp >= ts
    ? raid_battle_timestamp : raid_end_timestamp

  return (
    <Marker
      position={[item.lat, item.lon]}
      icon={gymMarker(item, ts)}
    >
      {hasRaid && (
        <>
          <Marker
            position={[item.lat, item.lon]}
            icon={raidMarker(item, ts)}
            className="marker"
          >
            <Popup position={[item.lat, item.lon]}>
              <PopupContent gym={item} hasRaid={hasRaid} ts={ts} />
            </Popup>
          </Marker>
          {showTimer && <Timer timestamp={timerToDisplay} />}
        </>
      )}
      <Popup position={[item.lat, item.lon]}>
        <PopupContent gym={item} hasRaid={hasRaid} ts={ts} />
      </Popup>
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

  return (
    prev.item.id === next.item.id
    && prev.item.updated === next.item.updated
    && prev.item.raid_pokemon_id === next.item.raid_pokemon_id
    && raidLogic()
    && prev.showTimer === next.showTimer
  )
}

export default memo(GymTile, areEqual)
