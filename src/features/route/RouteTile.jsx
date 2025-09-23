/* eslint-disable react/destructuring-assignment */
// @ts-check
import * as React from 'react'
import { Marker, Polyline, Popup, useMapEvents } from 'react-leaflet'
import { divIcon } from 'leaflet'
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
  const [linePopup, setLinePopup] = React.useState(
    /** @type {import('leaflet').LatLngExpression | null} */ (null),
  )

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
        setLinePopup(null)
      }
    },
  })
  useForcePopup(displayRoute.id, markerRef)

  React.useEffect(() => {
    setLinePopup(null)
  }, [displayRoute.id, orientation])

  const directionArrow = React.useMemo(() => {
    if (displayRoute.reversible || waypoints.length < 2) {
      return null
    }
    const index = Math.floor((waypoints.length - 1) / 2)
    const startPoint = waypoints[index]
    const nextPoint = waypoints[index + 1] || startPoint
    if (!startPoint || !nextPoint) {
      return null
    }
    const lat = (startPoint.lat_degrees + nextPoint.lat_degrees) / 2
    const lon = (startPoint.lng_degrees + nextPoint.lng_degrees) / 2
    const deltaLat = nextPoint.lat_degrees - startPoint.lat_degrees
    const deltaLon = nextPoint.lng_degrees - startPoint.lng_degrees
    const angle = (Math.atan2(deltaLat, deltaLon) * 180) / Math.PI
    const arrowColor = `#${displayRoute.image_border_color}`
    const icon = divIcon({
      className: 'route-direction',
      html: `<div class="route-direction__arrow" style="border-left-color: ${arrowColor}; transform: rotate(${angle}deg);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [0, 12],
    })
    return {
      position: [lat, lon],
      icon,
    }
  }, [displayRoute.image_border_color, displayRoute.reversible, waypoints])

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
          icon={
            displayRoute.reversible
              ? routeMarker('start')
              : routeMarker(position)
          }
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
          click: ({ originalEvent, latlng }) => {
            originalEvent.preventDefault()
            setClicked(true)
            if (latlng) {
              setLinePopup([latlng.lat, latlng.lng])
            }
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
      {directionArrow && (
        <Marker
          key={`${displayRoute.id}-${orientation}-arrow`}
          icon={directionArrow.icon}
          position={directionArrow.position}
          interactive={false}
          zIndexOffset={500}
        />
      )}
      {linePopup && (
        <Popup
          position={linePopup}
          eventHandlers={{
            remove: () => setLinePopup(null),
            close: () => setLinePopup(null),
          }}
        >
          <RoutePopup inline {...displayRoute} waypoints={waypoints} />
        </Popup>
      )}
    </>
  )
}

export const RouteTile = React.memo(
  BaseRouteTile,
  (prev, next) =>
    prev.route.updated === next.route.updated &&
    prev.orientation === next.orientation,
)
