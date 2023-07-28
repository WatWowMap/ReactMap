// @ts-check
import ErrorBoundary from '@components/ErrorBoundary'
import * as React from 'react'
import { CircleMarker, Marker, Polyline, Popup } from 'react-leaflet'
import { useLazyQuery } from '@apollo/client'
import Query from '@services/Query'

import routeMarker from '../markers/route'

/**
 *
 * @param {{
 *  item: import('../../../server/src/types').Route
 *  Icons: InstanceType<typeof import("@services/Icons").default>
 * }} props
 * @returns
 */
const RouteTile = ({ item, Icons }) => {
  const [route, setRoute] = React.useState({
    ...item,
    waypoints: [
      {
        lat_degrees: item.start_lat,
        lng_degrees: item.start_lon,
        elevation_in_meters: 0,
      },
      ...item.waypoints,
      { lat_degrees: item.end_lat, lng_degrees: item.end_lon },
    ],
  })
  const [open, setOpen] = React.useState(0)
  const refOne = React.useRef(null)
  const refTwo = React.useRef(null)

  const [getFullRoute, { data }] = useLazyQuery(Query.routes('getOne'), {
    variables: { id: item.id },
  })

  React.useEffect(() => {
    if (data?.route) {
      setRoute({ ...route, ...data.route })
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
        icon={routeMarker(Icons.getMisc('route-start'))}
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
        icon={routeMarker(Icons.getMisc('route-end'), true)}
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
          <CircleMarker
            key={`${waypoint.lat_degrees}-${waypoint.lng_degrees}-${waypoint.elevation_in_meters}`}
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
