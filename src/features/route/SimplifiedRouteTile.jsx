// @ts-check
import * as React from 'react'
import { useMapEvents } from 'react-leaflet'

import { RoutePoiMarker } from './RoutePoiMarker'

// Global route collection for proper clustering
const globalRouteStore = {
  routes: new Map(),
  clusters: new Map(),
  renderers: new Set(),

  addRoute(route) {
    this.routes.set(route.id, route)
    this.updateClusters()
  },

  removeRoute(routeId) {
    this.routes.delete(routeId)
    this.updateClusters()
  },

  updateClusters() {
    // Clear existing clusters
    this.clusters.clear()

    // Group routes by POI coordinates
    const allRoutes = Array.from(this.routes.values())
    const tolerance = 0.00001

    allRoutes.forEach((route) => {
      // For reversible routes, both endpoints are starting AND ending points
      if (route.reversible) {
        this.addToCluster(
          route.start_lat,
          route.start_lon,
          route,
          'both',
          tolerance,
        )
        // Only add end cluster if it's different from start
        const startKey = `${route.start_lat.toFixed(6)},${route.start_lon.toFixed(6)}`
        const endKey = `${route.end_lat.toFixed(6)},${route.end_lon.toFixed(6)}`
        if (startKey !== endKey) {
          this.addToCluster(
            route.end_lat,
            route.end_lon,
            route,
            'both',
            tolerance,
          )
        }
      } else {
        // For non-reversible routes, only start point
        this.addToCluster(
          route.start_lat,
          route.start_lon,
          route,
          'start',
          tolerance,
        )
      }
    })

    // Notify all renderers
    this.renderers.forEach((renderer) => renderer.forceUpdate())
  },

  addToCluster(lat, lon, route, poiType, tolerance) {
    // Find existing cluster within tolerance
    const existingCluster = Array.from(this.clusters.values()).find(
      (cluster) => {
        const latDiff = Math.abs(cluster.lat - lat)
        const lonDiff = Math.abs(cluster.lon - lon)
        return latDiff <= tolerance && lonDiff <= tolerance
      },
    )

    if (existingCluster) {
      // Add to existing cluster if not already there
      if (!existingCluster.routes.find((r) => r.id === route.id)) {
        existingCluster.routes.push(route)
      }
    } else {
      // Create new cluster
      const key = `${lat.toFixed(6)},${lon.toFixed(6)}`
      this.clusters.set(key, {
        lat,
        lon,
        routes: [route],
        poiType,
      })
    }
  },

  getClusters() {
    return Array.from(this.clusters.values())
  },

  addRenderer(renderer) {
    this.renderers.add(renderer)
  },

  removeRenderer(renderer) {
    this.renderers.delete(renderer)
  },
}

/**
 * Simplified route tile component that groups routes by POI
 * @param {{ routes: import("@rm/types").Route[] }} props
 */
export function SimplifiedRouteTile({ routes }) {
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0)

  // Register this component as a renderer
  React.useEffect(() => {
    const renderer = { forceUpdate }
    globalRouteStore.addRenderer(renderer)
    return () => globalRouteStore.removeRenderer(renderer)
  }, [])

  // Register routes with global store
  React.useEffect(() => {
    routes.forEach((route) => globalRouteStore.addRoute(route))
    return () => {
      routes.forEach((route) => globalRouteStore.removeRoute(route.id))
    }
  }, [routes])

  // Handle map clicks to close popups when clicking outside
  useMapEvents({
    click: ({ originalEvent }) => {
      if (!originalEvent.defaultPrevented) {
        // This could be used for closing popups, but currently handled by individual markers
      }
    },
  })

  // Only render clusters from the first route tile to avoid duplicates
  const shouldRender =
    routes.length > 0 &&
    routes[0].id === Array.from(globalRouteStore.routes.keys())[0]

  if (!shouldRender) {
    return null
  }

  const clusters = globalRouteStore.getClusters()

  return (
    <>
      {clusters.map((poi) => (
        <RoutePoiMarker
          key={`${poi.lat},${poi.lon}`}
          lat={poi.lat}
          lon={poi.lon}
          routes={poi.routes}
          poiType={poi.poiType}
        />
      ))}
    </>
  )
}
