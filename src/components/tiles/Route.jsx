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
  const [open, setOpen] = React.useState(0)
  const refOne = React.useRef(null)
  const refTwo = React.useRef(null)

  const [getFullRoute, { data }] = useLazyQuery(Query.routes('getOne'), {
    variables: { id: item.id },
  })

  React.useEffect(() => {
    if (data?.route) {
      setRoute(data.route)
    }
  }, [data])

  React.useEffect(() => {
    if (open === 1 && refOne.current) {
      refOne.current.openPopup()
    }
    if (open === 2 && refTwo.current) {
      refTwo.current.openPopup()
    }
  })

  const { waypoints = [], ...rest } = route || {}
  return (
    <>
      <Marker
        position={[route.start_lat, route.start_lon]}
        icon={routeMarker(route.image)}
        ref={refOne}
        eventHandlers={{
          click: () => getFullRoute({ variables: { id: item.id } }),
          popupclose: () => setOpen(0),
          popupopen: () => setOpen(1),
        }}
      >
        <Popup position={[route.start_lat, route.start_lon]}>
          {JSON.stringify(rest, null, 2)}
        </Popup>
      </Marker>
      <Marker
        position={[route.end_lat, route.end_lon]}
        icon={routeMarker(route.image)}
        ref={refTwo}
        eventHandlers={{
          click: () => getFullRoute({ variables: { id: item.id } }),
          popupclose: () => setOpen(0),
          popupopen: () => setOpen(2),
        }}
      >
        <Popup position={[route.end_lat, route.end_lon]}>
          {JSON.stringify(rest, null, 2)}
        </Popup>
      </Marker>
      <ErrorBoundary>
        {(waypoints || []).map((waypoint) => (
          <Circle
            key={`${waypoint.lat_degrees}-${waypoint.lng_degrees}`}
            center={[waypoint.lat_degrees, waypoint.lng_degrees]}
            radius={10}
          />
        ))}
        <Polyline
          positions={(waypoints || []).map((waypoint) => [
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
