/* eslint-disable react/destructuring-assignment */
// @ts-check
import * as React from 'react'
import { Marker, Polyline, useMapEvents } from 'react-leaflet'
import { darken } from '@mui/material/styles'

import { useForcePopup } from '@hooks/useForcePopup'

import { routeMarker } from './routeMarker'
import { RoutePopup } from './RoutePopup'

const POSITIONS = /** @type {const} */ (['start', 'end'])

const LINE_OPACITY = 0.33
const MARKER_OPACITY = LINE_OPACITY * 2

/**
 * @param {{
 *  route: import('@rm/types').Route,
 *  orientation?: 'forward' | 'reverse',
 * }} props
 */
const BaseRouteTile = ({ route, orientation = 'forward' }) => {
  const [clicked, setClicked] = React.useState(false)
  const [hover, setHover] = React.useState('')

  /** @type {React.MutableRefObject<import("leaflet").Polyline>} */
  const lineRef = React.useRef()
  const [markerRef, setMarkerRef] = React.useState(null)

  const displayRoute = React.useMemo(() => {
    if (orientation === 'forward') return route
    const reversedWaypoints = [...(route.waypoints || [])]
      .map((waypoint) => ({ ...waypoint }))
      .reverse()
    return {
      ...route,
      start_lat: route.end_lat,
      start_lon: route.end_lon,
      start_image: route.end_image,
      start_fort_id: route.end_fort_id,
      end_lat: route.start_lat,
      end_lon: route.start_lon,
      end_image: route.start_image,
      end_fort_id: route.start_fort_id,
      waypoints: reversedWaypoints,
    }
  }, [orientation, route])

  const waypoints = React.useMemo(() => {
    const internal = displayRoute.waypoints || []
    return [
      {
        lat_degrees: displayRoute.start_lat,
        lng_degrees: displayRoute.start_lon,
        elevation_in_meters: internal[0]?.elevation_in_meters || 0,
      },
      ...internal,
      {
        lat_degrees: displayRoute.end_lat,
        lng_degrees: displayRoute.end_lon,
        elevation_in_meters:
          internal[internal.length - 1]?.elevation_in_meters || 1,
      },
    ]
  }, [displayRoute])

  const [color, darkened] = React.useMemo(
    () => [
      `#${displayRoute.image_border_color}`,
      darken(`#${displayRoute.image_border_color}`, 0.2),
    ],
    [displayRoute.image_border_color],
  )

  useMapEvents({
    click: ({ originalEvent }) => {
      if (!originalEvent.defaultPrevented) {
        setClicked(false)
        setHover('')
      }
    },
  })
  useForcePopup(displayRoute.id, markerRef)

  return (
    <>
      {POSITIONS.map((position) => (
        <Marker
          key={position}
          ref={position === 'start' ? setMarkerRef : undefined}
          opacity={hover || clicked ? 1 : MARKER_OPACITY}
          zIndexOffset={hover === position ? 2000 : hover || clicked ? 1000 : 0}
          position={[
            displayRoute[`${position}_lat`],
            displayRoute[`${position}_lon`],
          ]}
          icon={routeMarker(position)}
          eventHandlers={{
            popupopen: () => setClicked(true),
            popupclose: () => setClicked(false),
            mouseover: () => {
              if (lineRef.current) {
                lineRef.current.setStyle({ color: darkened, opacity: 1 })
              }
              setHover(position)
            },
            mouseout: () => {
              if (lineRef.current && !clicked) {
                lineRef.current.setStyle({ color, opacity: MARKER_OPACITY })
              }
              setHover('')
            },
          }}
        >
          <RoutePopup
            {...displayRoute}
            waypoints={waypoints}
            end={position === 'end'}
          />
        </Marker>
      ))}
      <Polyline
        ref={lineRef}
        eventHandlers={{
          click: ({ originalEvent }) => {
            originalEvent.preventDefault()
            setClicked((prev) => !prev)
          },
          mouseover: ({ target }) => {
            if (target && !clicked) {
              target.setStyle({ color: darkened, opacity: 1 })
            }
          },
          mouseout: ({ target }) => {
            if (target && !clicked) {
              target.setStyle({ color, opacity: LINE_OPACITY })
            }
          },
        }}
        dashArray={displayRoute.reversible ? undefined : '5, 5'}
        positions={waypoints.map((waypoint) => [
          waypoint.lat_degrees,
          waypoint.lng_degrees,
        ])}
        pathOptions={{
          color: clicked || hover ? darkened : color,
          opacity: clicked || hover ? 1 : LINE_OPACITY,
          weight: 4,
        }}
      />
    </>
  )
}

export const RouteTile = React.memo(
  BaseRouteTile,
  (prev, next) =>
    prev.route.updated === next.route.updated &&
    prev.orientation === next.orientation,
)
