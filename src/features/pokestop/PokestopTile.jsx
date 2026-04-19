/* eslint-disable react/destructuring-assignment */
// @ts-check
import * as React from 'react'
import { Marker, Popup, Circle } from 'react-leaflet'

import { useMarkerTimer } from '@hooks/useMarkerTimer'
import { basicEqualFn, useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { useRouteStore, resolveRoutePoiKey } from '@features/route'
import { useForcePopup } from '@hooks/useForcePopup'
import { useManualPopupTracker } from '@hooks/useManualPopupTracker'
import { TooltipWrapper } from '@components/ToolTipWrapper'

import { PokestopPopup } from './PokestopPopup'
import {
  INCIDENT_DISPLAY_TYPES,
  getPokestopIncidentState,
} from './incidentPriority'
import { usePokestopMarker } from './usePokestopMarker'

/**
 *
 * @param {import('@rm/types').Pokestop} pokestop
 * @returns
 */
const BasePokestopTile = (pokestop) => {
  const [stateChange, setStateChange] = React.useState(false)
  const [markerRef, setMarkerRef] = React.useState(null)
  const ts = Date.now() / 1000
  const incidentState = getPokestopIncidentState({
    events: pokestop.events,
    invasions: pokestop.invasions,
    showcase_expiry: pokestop.showcase_expiry,
    incident_blocker_display_type: pokestop.incident_blocker_display_type,
    incident_blocker_expire_timestamp:
      pokestop.incident_blocker_expire_timestamp,
    ts,
  })
  const hasRoutes = useRouteStore(
    React.useCallback(
      (state) =>
        !!resolveRoutePoiKey(
          state.poiIndex,
          pokestop.id,
          pokestop.lat,
          pokestop.lon,
        ),
      [pokestop.id, pokestop.lat, pokestop.lon],
    ),
  )
  const selectPoi = useRouteStore((s) => s.selectPoi)

  const [
    canShowLures,
    canShowInvasions,
    canShowQuests,
    canShowEvents,
    canShowPokestops,
    hasTimerOverride,
    interactionRangeZoom,
  ] = useMemory(
    (s) => [
      !!s.auth.perms.lures,
      !!s.auth.perms.invasions,
      !!s.auth.perms.quests,
      !!s.auth.perms.eventStops,
      !!s.auth.perms.pokestops,
      s.timerList.includes(pokestop.id),
      s.config.general.interactionRangeZoom,
    ],
    basicEqualFn,
  )

  const [
    showEventStops,
    showAllStops,
    showInvasionTimers,
    showLureTimers,
    showEventStopTimers,
    showLureRange,
    showShowcaseRange,
    showInteractionRange,
    customRange,
    zoom,
  ] = useStorage((s) => {
    const { userSettings } = s
    return [
      !!s.filters.pokestops.eventStops,
      !!s.filters.pokestops.allPokestops,
      !!(userSettings.pokestops.invasionTimers || hasTimerOverride),
      !!(userSettings.pokestops.lureTimers || hasTimerOverride),
      !!(userSettings.pokestops.eventStopTimers || hasTimerOverride),
      !!userSettings.pokestops.lureRange,
      !!userSettings.pokestops.showcaseRange,
      !!userSettings.pokestops.interactionRanges,
      +userSettings.pokestops.customRange || 0,
      s.zoom,
    ]
  }, basicEqualFn)

  const hasLure = pokestop.lure_expire_timestamp > ts && canShowLures
  const hasQuest = !!(canShowQuests && pokestop.quests?.length)
  const hasInvasion = !!(
    canShowInvasions && incidentState.popupInvasions.length
  )
  const hasEvent = !!(
    canShowEvents &&
    showEventStops &&
    incidentState.popupEvents.length
  )
  const visibleMarkerInvasions = canShowInvasions
    ? incidentState.markerInvasions
    : []
  const visibleMarkerEvents =
    canShowEvents && showEventStops ? incidentState.markerEvents : []
  const hasVisibleInvasion = !!(
    canShowInvasions && visibleMarkerInvasions.length
  )
  const hasVisibleEvent = !!visibleMarkerEvents.length
  const hasVisibleShowcase = visibleMarkerEvents.some(
    (event) =>
      Number(event.display_type ?? 0) === INCIDENT_DISPLAY_TYPES.SHOWCASE,
  )
  const hasAllStops = !!(
    (showAllStops || pokestop.ar_scan_eligible) &&
    canShowPokestops
  )
  const withinRangeZoom = zoom >= interactionRangeZoom
  const lureRange = showLureRange && withinRangeZoom
  const showcaseRange =
    showShowcaseRange && withinRangeZoom && hasVisibleShowcase
  const interactionRange = showInteractionRange && withinRangeZoom
  const renderedCustomRange = withinRangeZoom ? customRange : 0

  const [refreshTimers, tooltipTimers] = React.useMemo(() => {
    const internalRefreshTimers = [...incidentState.expiryTimestamps]
    const internalTooltipTimers = /** @type {number[]} */ ([])

    if (showInvasionTimers && hasVisibleInvasion) {
      visibleMarkerInvasions.forEach((invasion) =>
        internalTooltipTimers.push(invasion.incident_expire_timestamp),
      )
    }
    if (showLureTimers && hasLure) {
      internalRefreshTimers.push(pokestop.lure_expire_timestamp)
      internalTooltipTimers.push(pokestop.lure_expire_timestamp)
    }
    if (showEventStopTimers && hasVisibleEvent) {
      visibleMarkerEvents.forEach((event) => {
        internalTooltipTimers.push(event.event_expire_timestamp)
      })
    }

    return [internalRefreshTimers, internalTooltipTimers]
  }, [
    incidentState.expiryTimestamps,
    visibleMarkerEvents,
    visibleMarkerInvasions,
    showInvasionTimers,
    hasVisibleInvasion,
    showLureTimers,
    hasLure,
    showEventStopTimers,
    hasVisibleEvent,
    pokestop.lure_expire_timestamp,
  ])

  useForcePopup(pokestop.id, markerRef)
  useMarkerTimer(
    refreshTimers.length ? Math.min(...refreshTimers) : null,
    markerRef,
    () => setStateChange(!stateChange),
  )
  const handlePopupOpen = useManualPopupTracker('pokestops', pokestop.id)

  const icon = usePokestopMarker({
    hasQuest,
    hasLure,
    markerEvents: visibleMarkerEvents,
    markerInvasions: visibleMarkerInvasions,
    baseIncidentDisplay:
      canShowEvents && showEventStops ? incidentState.baseDisplay : '',
    ...pokestop,
  })

  return hasQuest ||
    hasLure ||
    hasVisibleInvasion ||
    hasVisibleEvent ||
    hasAllStops ? (
    <Marker
      ref={setMarkerRef}
      position={[pokestop.lat, pokestop.lon]}
      icon={icon}
      eventHandlers={{
        click: () => {
          if (hasRoutes) {
            selectPoi(pokestop.id, pokestop.lat, pokestop.lon)
          }
        },
        popupopen: handlePopupOpen,
      }}
    >
      <Popup position={[pokestop.lat, pokestop.lon]}>
        <PokestopPopup
          hasLure={hasLure}
          hasInvasion={hasInvasion}
          hasQuest={hasQuest}
          hasEvent={hasEvent}
          popupInvasions={incidentState.popupInvasions}
          popupEvents={incidentState.popupEvents}
          incidentBlocker={incidentState.blocker}
          {...pokestop}
        />
      </Popup>
      {Boolean(tooltipTimers.length) && (
        <TooltipWrapper timers={tooltipTimers} offset={[0, 4]} />
      )}
      {interactionRange && (
        <Circle
          center={[pokestop.lat, pokestop.lon]}
          radius={80}
          pathOptions={{ color: '#0DA8E7', weight: 1 }}
        />
      )}
      {lureRange && (
        <Circle
          center={[pokestop.lat, pokestop.lon]}
          radius={40}
          pathOptions={{ color: '#32cd32', weight: 1 }}
        />
      )}
      {showcaseRange && (
        <Circle
          center={[pokestop.lat, pokestop.lon]}
          radius={500}
          pathOptions={{ color: '#39a18f', weight: 1 }}
        />
      )}
      {!!renderedCustomRange && (
        <Circle
          center={[pokestop.lat, pokestop.lon]}
          radius={renderedCustomRange}
          pathOptions={{ color: 'purple', weight: 0.5 }}
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
    prev.showcase_expiry === next.showcase_expiry &&
    prev.incident_blocker_display_type === next.incident_blocker_display_type &&
    prev.incident_blocker_expire_timestamp ===
      next.incident_blocker_expire_timestamp &&
    prev.quests?.length === next.quests?.length &&
    (prev.quests && next.quests
      ? prev.quests.every((q, i) => q.with_ar === next.quests[i]?.with_ar)
      : true) &&
    prev.invasions?.length === next.invasions?.length &&
    (prev.invasions && next.invasions
      ? prev.invasions.every(
          (inv, i) =>
            inv.confirmed === next.invasions?.[i]?.confirmed &&
            inv.grunt_type === next.invasions?.[i]?.grunt_type &&
            inv.incident_expire_timestamp ===
              next.invasions?.[i]?.incident_expire_timestamp,
        )
      : true) &&
    prev.events?.length === next.events?.length &&
    (prev.events && next.events
      ? prev.events.every(
          (event, i) =>
            event.display_type === next.events?.[i]?.display_type &&
            event.event_expire_timestamp ===
              next.events?.[i]?.event_expire_timestamp,
        )
      : true),
)
