// @ts-check
import * as React from 'react'
import { Marker, useMapEvents } from 'react-leaflet'

import { useStorage } from '@store/useStorage'

import { RouteTile } from './RouteTile'
import { routeFlagMarker } from './routeFlagMarker'
import { useRouteStore } from './useRouteStore'

const ACTIVE_Z_INDEX = 1800
const INACTIVE_Z_INDEX = 900

const RouteAnchor = React.memo(({ entry, selected, onSelect }) => {
  const icon = React.useMemo(
    () => routeFlagMarker(entry.routes.length, selected),
    [entry.routes.length, selected],
  )

  return (
    <Marker
      position={[entry.lat, entry.lon]}
      icon={icon}
      zIndexOffset={selected ? ACTIVE_Z_INDEX : INACTIVE_Z_INDEX}
      eventHandlers={{
        click: () => onSelect(entry.key),
      }}
    />
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
  const syncRoutes = useRouteStore((s) => s.syncRoutes)
  const poiIndex = useRouteStore((s) => s.poiIndex)
  const activeRoutes = useRouteStore((s) => s.activeRoutes)
  const activePoiId = useRouteStore((s) => s.activePoiId)
  const selectPoi = useRouteStore((s) => s.selectPoi)
  const clearSelection = useRouteStore((s) => s.clearSelection)

  React.useEffect(() => {
    syncRoutes(routes || [])
  }, [routes, syncRoutes])

  React.useEffect(() => {
    if (!enabled) {
      clearSelection()
    }
  }, [enabled, clearSelection])

  useMapEvents({
    click: ({ originalEvent }) => {
      if (!originalEvent.defaultPrevented) {
        clearSelection()
      }
    },
  })

  if (!enabled) {
    return null
  }

  const anchors = React.useMemo(() => Object.values(poiIndex), [poiIndex])

  return (
    <>
      {anchors.map((entry) => (
        <RouteAnchor
          key={entry.key}
          entry={entry}
          selected={entry.key === activePoiId}
          onSelect={selectPoi}
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
