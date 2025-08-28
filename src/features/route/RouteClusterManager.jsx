// @ts-check
import * as React from 'react'

import { useStorage } from '@store/useStorage'
import { RoutePoiMarker } from './RoutePoiMarker'

/**
 * Groups routes by their POI coordinates with proximity tolerance
 * For reversible routes, both endpoints are treated as both start AND end points
 * @param {import("@rm/types").Route[]} routes
 * @param {number} tolerance - Coordinate tolerance for grouping (default: 0.00001)
 * @returns {Map<string, { lat: number, lon: number, routes: import("@rm/types").Route[], poiType: 'both' | 'start' | 'end' }>}
 */
function clusterRoutesByPoi(routes, tolerance = 0.00001) {
  const clusters = new Map()

  routes.forEach((route) => {
    // For reversible routes, both endpoints are starting AND ending points
    if (route.reversible) {
      // Add route to start point cluster (which serves as both start and end)
      const startKey = findOrCreateCluster(
        clusters,
        route.start_lat,
        route.start_lon,
        tolerance,
        'both',
      )
      clusters.get(startKey).routes.push(route)

      // Add route to end point cluster (which serves as both start and end)
      const endKey = findOrCreateCluster(
        clusters,
        route.end_lat,
        route.end_lon,
        tolerance,
        'both',
      )
      // Only add to end cluster if it's different from start cluster
      if (endKey !== startKey) {
        clusters.get(endKey).routes.push(route)
      }
    } else {
      // For non-reversible routes, only the start point is a starting point
      const startKey = findOrCreateCluster(
        clusters,
        route.start_lat,
        route.start_lon,
        tolerance,
        'start',
      )
      clusters.get(startKey).routes.push(route)
    }
  })

  return clusters
}

/**
 * Find existing cluster or create new one based on coordinate proximity
 */
function findOrCreateCluster(clusters, lat, lon, tolerance, poiType) {
  // Check if there's an existing cluster within tolerance
  const existingCluster = Array.from(clusters.entries()).find(([, cluster]) => {
    const latDiff = Math.abs(cluster.lat - lat)
    const lonDiff = Math.abs(cluster.lon - lon)
    return latDiff <= tolerance && lonDiff <= tolerance
  })

  if (existingCluster) {
    return existingCluster[0]
  }

  // Create new cluster
  const key = `${lat.toFixed(6)},${lon.toFixed(6)}`
  clusters.set(key, {
    lat,
    lon,
    routes: [],
    poiType,
  })
  return key
}

/**
 * Route clustering manager that collects and groups routes
 */
export function RouteClusterManager({ children }) {
  const useSimplifiedRoutes = useStorage(
    (s) => s.settings?.useSimplifiedRoutes ?? true,
  )
  const [allRoutes, setAllRoutes] = React.useState([])

  // Collect routes from child components
  const addRoute = React.useCallback((route) => {
    setAllRoutes((prev) => {
      // Avoid duplicates
      if (prev.find((r) => r.id === route.id)) {
        return prev
      }
      return [...prev, route]
    })
  }, [])

  const removeRoute = React.useCallback((routeId) => {
    setAllRoutes((prev) => prev.filter((r) => r.id !== routeId))
  }, [])

  // Provide context for route collection
  const contextValue = React.useMemo(
    () => ({
      addRoute,
      removeRoute,
      useSimplifiedRoutes,
    }),
    [addRoute, removeRoute, useSimplifiedRoutes],
  )

  // Render clustered routes if simplified mode is enabled
  const clusteredRoutes = React.useMemo(() => {
    if (!useSimplifiedRoutes || allRoutes.length === 0) {
      return []
    }
    return Array.from(clusterRoutesByPoi(allRoutes).values())
  }, [allRoutes, useSimplifiedRoutes])

  return (
    <RouteClusterContext.Provider value={contextValue}>
      {children}

      {/* Render clustered POI markers in simplified mode */}
      {useSimplifiedRoutes &&
        clusteredRoutes.map((cluster) => (
          <RoutePoiMarker
            key={`${cluster.lat},${cluster.lon}`}
            lat={cluster.lat}
            lon={cluster.lon}
            routes={cluster.routes}
            poiType={cluster.poiType}
          />
        ))}
    </RouteClusterContext.Provider>
  )
}

// Context for route collection
const RouteClusterContext = React.createContext(null)
