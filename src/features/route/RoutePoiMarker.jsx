// @ts-check
import * as React from 'react'
import { Marker, Polyline } from 'react-leaflet'

import { routeMarker } from './routeMarker'
import { RoutePoiPopup } from './RoutePoiPopup'

/**
 * Component for displaying route POI markers with simplified view
 * @param {{
 *   lat: number
 *   lon: number
 *   routes: import("@rm/types").Route[]
 *   poiType: 'start' | 'end'
 * }} props
 */
export function RoutePoiMarker({ lat, lon, routes, poiType }) {
  const [selectedRoute, setSelectedRoute] = React.useState(null)
  const [showRoutes, setShowRoutes] = React.useState(false)

  // Use the existing route marker icon from the original implementation
  const flagIcon = React.useMemo(() => routeMarker('start'), [])

  const handleMarkerClick = React.useCallback(() => {
    setShowRoutes(true)
  }, [])

  const handleRouteSelect = React.useCallback((route) => {
    setSelectedRoute(route)
  }, [])

  const handleRouteDeselect = React.useCallback(() => {
    setSelectedRoute(null)
  }, [])

  const handlePopupClose = React.useCallback(() => {
    setShowRoutes(false)
    setSelectedRoute(null)
  }, [])

  // Group routes by their reversibility and type for better organization
  const organizedRoutes = React.useMemo(
    () =>
      routes.map((route) => ({
        ...route,
        waypoints: [
          {
            lat_degrees: route.start_lat,
            lng_degrees: route.start_lon,
            elevation_in_meters: route.waypoints[0]?.elevation_in_meters || 0,
          },
          ...route.waypoints,
          {
            lat_degrees: route.end_lat,
            lng_degrees: route.end_lon,
            elevation_in_meters:
              route.waypoints[route.waypoints.length - 1]
                ?.elevation_in_meters || 1,
          },
        ],
      })),
    [routes],
  )

  return (
    <>
      <Marker
        position={[lat, lon]}
        icon={flagIcon}
        eventHandlers={{
          click: handleMarkerClick,
          popupclose: handlePopupClose,
        }}
      >
        <RoutePoiPopup
          routes={organizedRoutes}
          poiType={poiType}
          selectedRoute={selectedRoute}
          onRouteSelect={handleRouteSelect}
          onRouteDeselect={handleRouteDeselect}
          showRoutes={showRoutes}
        />
      </Marker>

      {/* Render selected route path */}
      {selectedRoute && (
        <Polyline
          positions={selectedRoute.waypoints.map((waypoint) => [
            waypoint.lat_degrees,
            waypoint.lng_degrees,
          ])}
          pathOptions={{
            color: `#${selectedRoute.image_border_color}`,
            opacity: 0.8,
            weight: 4,
            dashArray: selectedRoute.reversible ? undefined : '5, 5',
          }}
          eventHandlers={{
            click: () => {
              // Keep the route visible when clicking on it
            },
          }}
        />
      )}
    </>
  )
}
