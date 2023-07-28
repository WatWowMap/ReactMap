// @ts-check
import * as React from 'react'
import { CircleMarker, Marker, Polyline } from 'react-leaflet'

import ErrorBoundary from '@components/ErrorBoundary'
import RoutePopup from '@components/popups/Route'

import routeMarker from '../markers/route'

const POSITIONS = /** @type {const} */ (['start', 'end'])

/**
 *
 * @param {{
 *  item: import('../../../server/src/types').Route
 *  Icons: InstanceType<typeof import("@services/Icons").default>
 * }} props
 * @returns
 */
const RouteTile = ({ item, Icons }) => {
  const waypoints = React.useMemo(
    () => [
      {
        lat_degrees: item.start_lat,
        lng_degrees: item.start_lon,
        elevation_in_meters: 0,
      },
      ...item.waypoints,
      {
        lat_degrees: item.end_lat,
        lng_degrees: item.end_lon,
        elevation_in_meters: 1,
      },
    ],
    [item],
  )

  return (
    <>
      {POSITIONS.map((position) => (
        <Marker
          key={position}
          position={[item[`${position}_lat`], item[`${position}_lon`]]}
          icon={routeMarker(
            Icons.getMisc(`route-${position}`),
            position === 'end',
          )}
        >
          <RoutePopup {...item} waypoints={waypoints} />
        </Marker>
      ))}
      <ErrorBoundary>
        {waypoints.map((waypoint) => (
          <CircleMarker
            key={`${waypoint.lat_degrees}-${waypoint.lng_degrees}-${waypoint.elevation_in_meters}`}
            center={[waypoint.lat_degrees, waypoint.lng_degrees]}
            radius={10}
          />
        ))}
        <Polyline
          positions={waypoints.map((waypoint) => [
            waypoint.lat_degrees,
            waypoint.lng_degrees,
          ])}
          pathOptions={{ color: 'red', fillColor: 'red' }}
        />
      </ErrorBoundary>
    </>
  )
}

export default React.memo(RouteTile, () => true)
