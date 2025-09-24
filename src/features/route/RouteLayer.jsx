// @ts-check
import * as React from 'react'
import { Marker, useMap, useMapEvents } from 'react-leaflet'
import { divIcon } from 'leaflet'
import { t } from 'i18next'

import { useStorage } from '@store/useStorage'

import { RouteTile } from './RouteTile'
import { routeMarker } from './routeMarker'
import { ROUTE_MARKER_PANE } from './constants'
import {
  useRouteStore,
  ROUTE_COORD_EPSILON,
  getRouteCoordKey,
} from './useRouteStore'

const ACTIVE_Z_INDEX = 1800
const INACTIVE_Z_INDEX = 900

const RouteAnchor = React.memo(
  ({
    entry,
    selected,
    onSelect,
    routeCount,
    variant = 'start',
    icon = null,
  }) => {
    const hideMarker = variant !== 'destination' && entry.isFort
    const baseIcon = React.useMemo(
      () => icon || routeMarker(variant === 'destination' ? 'end' : 'start'),
      [icon, variant],
    )
    const showBadge = routeCount > 1 || (hideMarker && routeCount > 0)
    const routeCountTitle =
      routeCount > 0 ? t('route_anchor_count', { count: routeCount }) : ''
    const badgeIcon = React.useMemo(() => {
      if (!showBadge) return null
      return divIcon({
        className: 'route-count-wrapper',
        html: `<span class="route-count-badge route-count-badge--${variant}">${routeCount}</span>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      })
    }, [routeCount, showBadge, variant])

    return (
      <>
        {variant !== 'destination' && !selected && !hideMarker && (
          <Marker
            position={[entry.lat, entry.lon]}
            icon={baseIcon}
            zIndexOffset={INACTIVE_Z_INDEX}
            riseOnHover
            pane={ROUTE_MARKER_PANE}
            eventHandlers={{
              click: () => onSelect(entry.key),
            }}
            title={routeCountTitle}
          />
        )}
        {badgeIcon && (
          <Marker
            position={[entry.lat, entry.lon]}
            icon={badgeIcon}
            interactive={hideMarker}
            keyboard={false}
            pane={hideMarker ? 'markerPane' : 'tooltipPane'}
            zIndexOffset={
              selected ? ACTIVE_Z_INDEX + 200 : INACTIVE_Z_INDEX + 200
            }
            title={routeCountTitle}
            eventHandlers={
              hideMarker
                ? {
                    click: () => onSelect(entry.key),
                  }
                : undefined
            }
          />
        )}
      </>
    )
  },
)

const ActiveRoute = React.memo(({ selection }) => {
  const route = useRouteStore(
    React.useCallback(
      (state) => state.routeCache[selection.routeId],
      [selection.routeId],
    ),
  )

  if (!route) return null
  return <RouteTile route={route} orientation={selection.orientation} />
})

export function RouteLayer({ routes }) {
  const map = useMap()
  const enabled = useStorage((s) => !!s.filters?.routes?.enabled)
  const compactView = useStorage(
    (s) => s.userSettings.routes?.compactView ?? true,
  )
  const syncRoutes = useRouteStore((s) => s.syncRoutes)
  const poiIndex = useRouteStore((s) => s.poiIndex)
  const routeCache = useRouteStore((s) => s.routeCache)
  const activeRoutes = useRouteStore((s) => s.activeRoutes)
  const activePoiId = useRouteStore((s) => s.activePoiId)
  const selectPoi = useRouteStore((s) => s.selectPoi)
  const clearSelection = useRouteStore((s) => s.clearSelection)

  React.useEffect(() => {
    if (!map) return
    let pane = map.getPane(ROUTE_MARKER_PANE)
    if (!pane) {
      pane = map.createPane(ROUTE_MARKER_PANE)
    }
    if (pane) {
      pane.style.zIndex = '400'
    }
  }, [map])

  React.useEffect(() => {
    syncRoutes(routes || [])
  }, [routes, syncRoutes])

  React.useEffect(() => {
    if (!enabled || !compactView) {
      clearSelection()
    }
  }, [enabled, compactView, clearSelection])

  useMapEvents({
    click: ({ originalEvent }) => {
      if (!originalEvent.defaultPrevented) {
        clearSelection()
      }
    },
  })

  const destinationSummary = React.useMemo(() => {
    if (!compactView)
      return { keys: new Set(), icons: new Map(), counts: new Map() }
    const keys = new Set()
    const icons = new Map()
    const counts = new Map()
    activeRoutes.forEach((selection) => {
      const route = routeCache[selection.routeId]
      if (!route) return
      const isForward = selection.orientation === 'forward'
      const lat = isForward ? route.end_lat : route.start_lat
      const lon = isForward ? route.end_lon : route.start_lon
      const coordKey = getRouteCoordKey(lat, lon)
      keys.add(coordKey)
      counts.set(coordKey, (counts.get(coordKey) || 0) + 1)
      if (!icons.has(coordKey)) {
        icons.set(coordKey, routeMarker('end'))
      }
    })
    return { keys, icons, counts }
  }, [activeRoutes, routeCache, compactView])

  const anchors = React.useMemo(() => {
    if (!compactView) return []
    const values = Object.values(poiIndex)
    return values.map((entry) => {
      const uniqueRoutes = new Set()
      values.forEach((candidate) => {
        if (
          Math.abs(candidate.lat - entry.lat) <= ROUTE_COORD_EPSILON &&
          Math.abs(candidate.lon - entry.lon) <= ROUTE_COORD_EPSILON
        ) {
          candidate.routes.forEach((ref) => {
            if (routeCache[ref.routeId]) {
              uniqueRoutes.add(ref.routeId)
            }
          })
        }
      })
      return {
        entry,
        routeCount:
          uniqueRoutes.size || new Set(entry.routes.map((r) => r.routeId)).size,
      }
    })
  }, [compactView, poiIndex, routeCache])

  if (!enabled) {
    return null
  }

  if (!compactView) {
    return (
      <>
        {routes.map((route) => (
          <RouteTile key={route.id} route={route} />
        ))}
      </>
    )
  }

  return (
    <>
      {anchors.map(({ entry, routeCount }) => {
        const entryCoordKey = getRouteCoordKey(entry.lat, entry.lon)
        const iconOverride = destinationSummary.icons.get(entryCoordKey)
        const destinationCount = destinationSummary.counts.get(entryCoordKey)
        if (destinationCount && destinationCount > 1) {
          return (
            <RouteAnchor
              key={`${entry.key}-destination`}
              entry={entry}
              selected={entry.key === activePoiId}
              onSelect={selectPoi}
              routeCount={destinationCount}
              variant="destination"
              icon={iconOverride || undefined}
            />
          )
        }
        if (
          destinationSummary.keys.has(entryCoordKey) &&
          entry.key !== activePoiId
        ) {
          return null
        }
        return (
          <RouteAnchor
            key={entry.key}
            entry={entry}
            selected={entry.key === activePoiId}
            onSelect={selectPoi}
            routeCount={destinationCount || routeCount}
            variant="start"
            icon={iconOverride || undefined}
          />
        )
      })}
      {activeRoutes.map((selection) => (
        <ActiveRoute
          key={`${selection.routeId}-${selection.orientation}`}
          selection={selection}
        />
      ))}
    </>
  )
}
