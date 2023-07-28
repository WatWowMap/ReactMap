// @ts-check
import * as React from 'react'
import { Marker, Polyline } from 'react-leaflet'
import { darken } from '@mui/material'

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
          icon={routeMarker(Icons.getMisc(`route-${position}`), position)}
        >
          <RoutePopup
            {...item}
            waypoints={waypoints}
            end={position === 'end'}
          />
        </Marker>
      ))}
      <ErrorBoundary>
        <Polyline
          eventHandlers={{
            click: ({ target }) => {
              if (target) {
                target.setStyle({
                  color: target.options.clicked
                    ? `#${item.image_border_color}`
                    : darken(`#${item.image_border_color}`, 0.2),
                })
                target.options.clicked = !target.options.clicked
              }
            },
            mouseover: ({ target }) => {
              if (target?.options.clicked !== true) {
                target.setStyle({
                  color: darken(`#${item.image_border_color}`, 0.2),
                })
              }
            },
            mouseout: ({ target }) => {
              if (target?.options.clicked !== true) {
                target.setStyle({
                  color: `#${item.image_border_color}`,
                })
              }
            },
          }}
          dashArray={item.reversible ? undefined : '5, 5'}
          positions={waypoints.map((waypoint) => [
            waypoint.lat_degrees,
            waypoint.lng_degrees,
          ])}
          pathOptions={{
            color: `#${item.image_border_color}`,
            fillColor: `#${item.image_border_color}`,
          }}
        />
      </ErrorBoundary>
    </>
  )
}

export default React.memo(RouteTile, () => true)
