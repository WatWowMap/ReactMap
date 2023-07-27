// @ts-check
import ErrorBoundary from '@components/ErrorBoundary'
import * as React from 'react'
import { Circle, Marker, Polyline, Popup } from 'react-leaflet'
import { useLazyQuery } from '@apollo/client'
import Query from '@services/Query'

import routeMarker from '../markers/route'

/**
 *
 * @param {{
 *  item: import('../../../server/src/types').Route
 * }} props
 * @returns
 */
const RouteTile = ({ item }) => {
  const [route, setRoute] = React.useState(item)
  const [getFullRoute, { data }] = useLazyQuery(Query.routes('getOne'), {
    variables: { id: item.id },
  })

  React.useEffect(() => {
    if (data?.route) {
      setRoute(data.route)
    }
  }, [data])

  const { waypoints = [], ...rest } = route || {}
  return (
    <>
      <Marker
        position={[route.start_lat, route.start_lon]}
        icon={routeMarker(route.image)}
        eventHandlers={{
          popupopen: () => getFullRoute({ variables: { id: item.id } }),
        }}
      >
        <Popup position={[route.start_lat, route.start_lon]}>
          {JSON.stringify(rest, null, 2)}
        </Popup>
      </Marker>
      <Marker
        position={[route.end_lat, route.end_lon]}
        icon={routeMarker(route.image)}
        eventHandlers={{
          popupopen: () => getFullRoute({ variables: { id: item.id } }),
        }}
      >
        <Popup position={[route.end_lat, route.end_lon]}>
          {JSON.stringify(rest, null, 2)}
        </Popup>
      </Marker>
      <ErrorBoundary>
        {waypoints.map((waypoint) => (
          <Circle
            key={`${waypoint.lat_degrees}-${waypoint.lon_degrees}`}
            center={[waypoint.lat_degrees, waypoint.lon_degrees]}
            radius={70}
          />
        ))}
        <Polyline
          positions={waypoints.map((waypoint) => [
            waypoint.lat_degrees,
            waypoint.lon_degrees,
          ])}
          pathOptions={{ color: 'red', fillColor: 'red' }}
        />
      </ErrorBoundary>
    </>
  )
}

export default React.memo(RouteTile, () => true)
