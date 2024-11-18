/* eslint-disable react/destructuring-assignment */
// @ts-check
import * as React from 'react'
import { Marker, Popup } from 'react-leaflet'

import { useMarkerTimer } from '@hooks/useMarkerTimer'
import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { useForcePopup } from '@hooks/useForcePopup'
import { TooltipWrapper } from '@components/ToolTipWrapper'

import { StationPopup } from './StationPopup'
import { useStationMarker } from './useStationMarker'

/**
 *
 * @param {import('@rm/types').Station} station
 * @returns
 */
const BaseStationTile = (station) => {
  const [stateChange, setStateChange] = React.useState(false)
  const [markerRef, setMarkerRef] = React.useState(null)

  const individualTimer = useMemory((s) => s.timerList.includes(station.id))

  const showTimer = useStorage(
    (s) => s?.userSettings?.stations?.stationTimers || individualTimer,
  )

  const timers = React.useMemo(() => {
    const now = Date.now() / 1000
    const internalTimers = /** @type {number[]} */ ([])
    if (showTimer && station.start_time && station.start_time > now) {
      internalTimers.push(station.start_time)
    } else if (showTimer && station.end_time && station.end_time > now) {
      internalTimers.push(station.end_time)
    }
    return internalTimers
  }, [showTimer])

  useForcePopup(station.id, markerRef)
  useMarkerTimer(timers.length ? Math.min(...timers) : null, markerRef, () =>
    setStateChange(!stateChange),
  )

  return (
    <Marker
      ref={setMarkerRef}
      position={[station.lat, station.lon]}
      icon={useStationMarker(station)}
    >
      <Popup position={[station.lat, station.lon]}>
        <StationPopup {...station} />
      </Popup>
      {!!(showTimer && timers.length > 0) && (
        <TooltipWrapper timers={timers} offset={[0, 4]} />
      )}
    </Marker>
  )
}

function compareValueOrFalsy(prev, next) {
  return prev === next || (!prev && !next)
}

export const StationTile = React.memo(
  BaseStationTile,
  (prev, next) =>
    prev.id === next.id &&
    compareValueOrFalsy(prev.battle_level, next.battle_level) &&
    compareValueOrFalsy(prev.battle_pokemon_id, next.battle_pokemon_id) &&
    prev.start_time === next.start_time &&
    prev.end_time === next.end_time,
)
