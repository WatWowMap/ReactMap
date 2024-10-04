import * as React from 'react'
import { Marker, Popup, Circle } from 'react-leaflet'
import { useMarkerTimer } from '@hooks/useMarkerTimer'
import { basicEqualFn, useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { useForcePopup } from '@hooks/useForcePopup'
import { TooltipWrapper } from '@components/ToolTipWrapper'

import { PokestopPopup } from './PokestopPopup'
import { usePokestopMarker } from './usePokestopMarker'

const BasePokestopTile = (pokestop: import('@rm/types').Pokestop) => {
  const [stateChange, setStateChange] = React.useState(false)
  const [markerRef, setMarkerRef] = React.useState(null)

  const [
    hasLure,
    hasInvasion,
    hasQuest,
    hasEvent,
    hasAllStops,
    showTimer,
    interactionRangeZoom,
  ] = useMemory((s) => {
    const newTs = Date.now() / 1000
    const { filters } = useStorage.getState()
    const {
      config,
      timerList,
      auth: { perms },
    } = s

    return [
      pokestop.lure_expire_timestamp > newTs && perms.lures,
      !!(
        perms.invasions &&
        pokestop.invasions?.some(
          (invasion) =>
            invasion.grunt_type && invasion.incident_expire_timestamp > newTs,
        )
      ),
      !!(perms.quests && pokestop.quests?.length),
      !!(
        perms.eventStops &&
        filters.pokestops.eventStops &&
        pokestop.events?.some((event) => event.event_expire_timestamp > newTs)
      ),
      (filters.pokestops.allPokestops || pokestop.ar_scan_eligible) &&
        perms.pokestops,
      timerList.includes(pokestop.id),
      config.general.interactionRangeZoom,
    ]
  }, basicEqualFn)

  const [
    invasionTimers,
    lureTimers,
    eventStopTimers,
    lureRange,
    interactionRange,
    customRange,
  ] = useStorage((s) => {
    const { userSettings, zoom } = s

    return [
      userSettings.pokestops.invasionTimers || showTimer,
      userSettings.pokestops.lureTimers || showTimer,
      userSettings.pokestops.eventStopTimers || showTimer,
      !!userSettings.pokestops.lureRange && zoom >= interactionRangeZoom,
      !!userSettings.pokestops.interactionRanges &&
        zoom >= interactionRangeZoom,
      zoom >= interactionRangeZoom
        ? +userSettings.pokestops.customRange || 0
        : 0,
    ]
  }, basicEqualFn)

  const timers = React.useMemo(() => {
    const internalTimers = /** @type {number[]} */ []

    if (invasionTimers && hasInvasion) {
      pokestop.invasions.forEach((invasion) =>
        internalTimers.push(invasion.incident_expire_timestamp),
      )
    }
    if (lureTimers && hasLure) {
      internalTimers.push(pokestop.lure_expire_timestamp)
    }
    if (eventStopTimers && hasEvent) {
      pokestop.events.forEach((event) => {
        internalTimers.push(event.event_expire_timestamp)
      })
    }

    return internalTimers
  }, [
    invasionTimers,
    hasInvasion,
    lureTimers,
    hasLure,
    eventStopTimers,
    hasEvent,
  ])

  useForcePopup(pokestop.id, markerRef)
  useMarkerTimer(timers.length ? Math.min(...timers) : null, markerRef, () =>
    setStateChange(!stateChange),
  )

  const icon = usePokestopMarker({
    hasQuest,
    hasLure,
    hasInvasion,
    hasEvent,
    ...pokestop,
  })

  return hasQuest || hasLure || hasInvasion || hasEvent || hasAllStops ? (
    <Marker
      ref={setMarkerRef}
      icon={icon}
      position={[pokestop.lat, pokestop.lon]}
    >
      <Popup position={[pokestop.lat, pokestop.lon]}>
        <PokestopPopup
          hasEvent={hasEvent}
          hasInvasion={hasInvasion}
          hasLure={hasLure}
          hasQuest={hasQuest}
          {...pokestop}
        />
      </Popup>
      {Boolean(timers.length) && (
        <TooltipWrapper offset={[0, 4]} timers={timers} />
      )}
      {interactionRange && (
        <Circle
          center={[pokestop.lat, pokestop.lon]}
          pathOptions={{ color: '#0DA8E7', weight: 1 }}
          radius={80}
        />
      )}
      {lureRange && (
        <Circle
          center={[pokestop.lat, pokestop.lon]}
          pathOptions={{ color: '#32cd32', weight: 1 }}
          radius={40}
        />
      )}
      {!!customRange && (
        <Circle
          center={[pokestop.lat, pokestop.lon]}
          pathOptions={{ color: 'purple', weight: 0.5 }}
          radius={customRange}
        />
      )}
    </Marker>
  ) : null
}

export const PokestopTile = React.memo(
  BasePokestopTile,
  (prev, next) =>
    prev.id === next.id &&
    prev.lure_expire_timestamp === next.lure_expire_timestamp &&
    prev.updated === next.updated &&
    prev.quests?.length === next.quests?.length &&
    (prev.quests && next.quests
      ? prev.quests.every((q, i) => q.with_ar === next.quests[i]?.with_ar)
      : true) &&
    prev.invasions?.length === next.invasions?.length &&
    (prev.invasions && next.invasions
      ? prev.invasions?.every(
          (inv, i) =>
            inv.confirmed === next?.invasions?.[i]?.confirmed &&
            inv.grunt_type === next?.invasions?.[i]?.grunt_type,
        )
      : true) &&
    prev.events?.length === next.events?.length,
)
