// @ts-check
import * as React from 'react'
import { Marker, useMapEvents } from 'react-leaflet'
import { divIcon } from 'leaflet'

import { useStorage } from '@store/useStorage'

import { RouteTile } from './RouteTile'
import { routeMarker } from './routeMarker'
import { useRouteStore } from './useRouteStore'

const ACTIVE_Z_INDEX = 1800
const INACTIVE_Z_INDEX = 900

const RouteAnchor = React.memo(({ entry, selected, onSelect, routeCount }) => {
  const baseIcon = React.useMemo(() => routeMarker('start'), [])
  const badgeIcon = React.useMemo(() => {
    if (routeCount <= 1) return null
    return divIcon({
      className: 'route-count-wrapper',
      html: `<span class="route-count-badge">${routeCount}</span>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    })
  }, [routeCount])

  return (
    <>
      {!selected && (
        <Marker
          position={[entry.lat, entry.lon]}
          icon={baseIcon}
          zIndexOffset={INACTIVE_Z_INDEX}
          riseOnHover
          eventHandlers={{
            click: () => onSelect(entry.key),
          }}
          title={routeCount > 1 ? `${routeCount} routes` : ''}
        />
      )}
      {badgeIcon && (
        <Marker
          position={[entry.lat, entry.lon]}
          icon={badgeIcon}
          interactive={false}
          keyboard={false}
          pane="tooltipPane"
          zIndexOffset={
            selected ? ACTIVE_Z_INDEX + 200 : INACTIVE_Z_INDEX + 200
          }
        />
      )}
    </>
  )
})

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

  const anchors = React.useMemo(() => {
    if (!compactView) return []
    const epsilon = 1 / 10 ** 6
    const values = Object.values(poiIndex)
    return values.map((entry) => {
      const seen = new Set()
      let count = 0
      values.forEach((candidate) => {
        if (
          Math.abs(candidate.lat - entry.lat) <= epsilon &&
          Math.abs(candidate.lon - entry.lon) <= epsilon
        ) {
          candidate.routes.forEach((ref) => {
            const id = `${ref.routeId}-${ref.orientation}`
            if (!seen.has(id) && routeCache[ref.routeId]) {
              seen.add(id)
              count += 1
            }
          })
        }
      })
      return { entry, routeCount: count || entry.routes.length || 1 }
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
      {anchors.map(({ entry, routeCount }) => (
        <RouteAnchor
          key={entry.key}
          entry={entry}
          selected={entry.key === activePoiId}
          onSelect={selectPoi}
          routeCount={routeCount}
        />
      ))}
      {activeRoutes.map((selection) => (
        <ActiveRoute
          key={`${selection.routeId}-${selection.orientation}`}
          selection={selection}
        />
      ))}
    </>
  )
}
