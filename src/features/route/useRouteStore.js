// @ts-check

import { create } from 'zustand'

const PRECISION = 6

export const ROUTE_COORD_EPSILON = 1 / 10 ** PRECISION

/**
 * @typedef {{
 *  routeId: string,
 *  orientation: 'forward' | 'reverse',
 * }} RouteSelection
 */

/**
 * @typedef {{
 *  key: string,
 *  poiId: string,
 *  lat: number,
 *  lon: number,
 *  isFort: boolean,
 *  routes: RouteSelection[],
 * }} RoutePoiIndex
 */

/**
 * @param {number} lat
 * @param {number} lon
 * @param {'start' | 'end'} prefix
 */
const fallbackKey = (lat, lon, prefix) =>
  `${prefix}:${lat.toFixed(PRECISION)}:${lon.toFixed(PRECISION)}`

/**
 * @param {Record<string, RoutePoiIndex>} poiIndex
 * @param {RoutePoiIndex | null} entry
 * @param {Record<string, import('@rm/types').Route>} routeCache
 * @returns {RouteSelection[]}
 */
const collectNearbyRoutes = (poiIndex, entry, routeCache) => {
  if (!entry) return []
  const seen = new Set()
  /** @type {RouteSelection[]} */
  const combined = []
  Object.values(poiIndex).forEach((candidate) => {
    if (
      Math.abs(candidate.lat - entry.lat) <= ROUTE_COORD_EPSILON &&
      Math.abs(candidate.lon - entry.lon) <= ROUTE_COORD_EPSILON
    ) {
      candidate.routes.forEach((ref) => {
        const id = `${ref.routeId}-${ref.orientation}`
        if (!seen.has(id) && routeCache[ref.routeId]) {
          seen.add(id)
          combined.push(ref)
        }
      })
    }
  })
  return combined
}

/**
 * @param {Record<string, RoutePoiIndex>} poiIndex
 * @param {import('@rm/types').Route} route
 * @param {'forward' | 'reverse'} orientation
 */
const addPoiEntry = (poiIndex, route, orientation) => {
  const isForward = orientation === 'forward'
  const poiId = isForward ? route.start_fort_id : route.end_fort_id
  const lat = isForward ? route.start_lat : route.end_lat
  const lon = isForward ? route.start_lon : route.end_lon
  const key = poiId || fallbackKey(lat, lon, isForward ? 'start' : 'end')

  const existing = poiIndex[key] || {
    key,
    poiId: poiId || key,
    lat,
    lon,
    isFort: !!poiId,
    routes: [],
  }
  if (
    !existing.routes.some(
      (ref) => ref.routeId === route.id && ref.orientation === orientation,
    )
  ) {
    existing.routes = [...existing.routes, { routeId: route.id, orientation }]
  }
  poiIndex[key] = existing
}

/**
 * @typedef {{
 *  routeCache: Record<string, import('@rm/types').Route>,
 *  poiIndex: Record<string, RoutePoiIndex>,
 *  activePoiId: string,
 *  activeRoutes: RouteSelection[],
 *  syncRoutes: (routes: import('@rm/types').Route[]) => void,
 *  selectPoi: (poiId: string) => void,
 *  clearSelection: () => void,
 * }} RouteStore
 */
export const useRouteStore = create(
  /** @returns {RouteStore} */
  (set) => ({
    routeCache: {},
    poiIndex: {},
    activePoiId: '',
    activeRoutes: [],
    syncRoutes: (routes) => {
      set((state) => {
        const poiIndex = {}
        const incomingIds = new Set()
        const nextRouteCache = { ...state.routeCache }

        routes.forEach((route) => {
          if (!route?.id) return
          incomingIds.add(route.id)
          nextRouteCache[route.id] = route
          addPoiEntry(poiIndex, route, 'forward')
          if (route.reversible) {
            addPoiEntry(poiIndex, route, 'reverse')
          }
        })

        const activeRouteIds = new Set(
          state.activeRoutes.map((ref) => ref.routeId),
        )
        Object.keys(nextRouteCache).forEach((routeId) => {
          if (!incomingIds.has(routeId) && !activeRouteIds.has(routeId)) {
            delete nextRouteCache[routeId]
          }
        })

        const { activePoiId } = state
        const activeEntry = activePoiId ? poiIndex[activePoiId] : null
        const nearbyActiveRoutes = collectNearbyRoutes(
          poiIndex,
          activeEntry,
          nextRouteCache,
        )
        const nextActiveRoutes = nearbyActiveRoutes.length
          ? nearbyActiveRoutes
          : state.activeRoutes.filter((ref) => nextRouteCache[ref.routeId])

        return {
          poiIndex,
          routeCache: nextRouteCache,
          activeRoutes: nextActiveRoutes,
        }
      })
    },
    selectPoi: (poiId) => {
      set((state) => {
        if (!poiId) {
          return state
        }
        if (state.activePoiId === poiId) {
          return {
            ...state,
            activePoiId: '',
            activeRoutes: [],
          }
        }
        const entry = state.poiIndex[poiId]
        if (!entry) {
          return state
        }
        const routes = collectNearbyRoutes(
          state.poiIndex,
          entry,
          state.routeCache,
        )
        return {
          ...state,
          activePoiId: poiId,
          activeRoutes: routes,
        }
      })
    },
    clearSelection: () =>
      set((state) =>
        state.activePoiId
          ? {
              ...state,
              activePoiId: '',
              activeRoutes: [],
            }
          : state,
      ),
  }),
)
