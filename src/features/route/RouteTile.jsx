/* eslint-disable react/destructuring-assignment */
// @ts-check
import * as React from 'react'
import { Marker, Polyline, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet-arrowheads'
import { darken } from '@mui/material/styles'

import { useForcePopup } from '@hooks/useForcePopup'

import { routeMarker } from './routeMarker'
import { ROUTE_MARKER_PANE } from './constants'
import { RoutePopup } from './RoutePopup'

const POSITIONS = /** @type {const} */ (['start', 'end'])

const LINE_OPACITY = 0.33
const MARKER_OPACITY = LINE_OPACITY * 2

const BaseRouteTile = ({ route, orientation = 'forward' }) => {
  const [clicked, setClicked] = React.useState(false)
  const [hover, setHover] = React.useState('')
  const [linePopup, setLinePopup] = React.useState(
    /** @type {import('leaflet').LatLngExpression | null} */ (null),
  )

  /** @type {React.MutableRefObject<import("leaflet").Polyline>} */
  const lineRef = React.useRef()
  const [markerRef, setMarkerRef] = React.useState(null)
  /** @type {React.MutableRefObject<import('leaflet').LayerGroup | null>} */
  const arrowheadsRef = React.useRef(null)

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

  const polylinePositions = React.useMemo(
    () =>
      waypoints.map((waypoint) => [waypoint.lat_degrees, waypoint.lng_degrees]),
    [waypoints],
  )

  const applyArrowheadStyle = React.useCallback(
    (targetColor, targetOpacity) => {
      const group = arrowheadsRef.current
      if (!group) {
        return
      }
      /** @type {any} */ group.eachLayer((layer) => {
        if (layer && typeof layer.setStyle === 'function') {
          layer.setStyle({ color: targetColor, opacity: targetOpacity })
        }
      })
    },
    [],
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

  React.useEffect(() => {
    const line = lineRef.current
    if (!line) {
      arrowheadsRef.current = null
      return undefined
    }

    const arrowLine = /** @type {any} */ (line)
    if (typeof arrowLine.deleteArrowheads === 'function') {
      arrowLine.deleteArrowheads()
    }
    arrowheadsRef.current = null

    if (
      !displayRoute.reversible &&
      typeof arrowLine.arrowheads === 'function'
    ) {
      arrowLine.arrowheads({
        size: '10px',
        frequency: '24px',
        yawn: 32,
        fill: false,
        offsets: {
          start: '10px',
          end: '10px',
        },
      })
      if (typeof line.redraw === 'function') {
        line.redraw()
      }
      if (typeof arrowLine.getArrowheads === 'function') {
        try {
          const group = arrowLine.getArrowheads()
          arrowheadsRef.current = group || null
        } catch (error) {
          arrowheadsRef.current = null
        }
      }
      applyArrowheadStyle(color, LINE_OPACITY)
    }

    return () => {
      if (typeof arrowLine.deleteArrowheads === 'function') {
        arrowLine.deleteArrowheads()
      }
      arrowheadsRef.current = null
    }
  }, [applyArrowheadStyle, color, displayRoute.reversible, polylinePositions])

  const isActive = Boolean(clicked || hover)

  React.useEffect(() => {
    if (lineRef.current) {
      const lineOpacity = isActive ? 1 : LINE_OPACITY
      lineRef.current.setStyle({
        color: isActive ? darkened : color,
        opacity: lineOpacity,
      })
    }
    applyArrowheadStyle(
      isActive ? darkened : color,
      isActive ? 1 : LINE_OPACITY,
    )
  }, [applyArrowheadStyle, color, darkened, isActive])

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
          pane={ROUTE_MARKER_PANE}
          eventHandlers={{
            popupopen: () => setClicked(true),
            popupclose: () => setClicked(false),
            mouseover: () => {
              if (lineRef.current) {
                lineRef.current.setStyle({
                  color: darkened,
                  opacity: 1,
                })
              }
              applyArrowheadStyle(darkened, 1)
              setHover(position)
            },
            mouseout: () => {
              if (lineRef.current && !clicked) {
                lineRef.current.setStyle({
                  color,
                  opacity: LINE_OPACITY,
                })
              }
              if (!clicked) {
                applyArrowheadStyle(color, LINE_OPACITY)
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
            if (lineRef.current) {
              lineRef.current.setStyle({
                color: darkened,
                opacity: 1,
              })
            }
            applyArrowheadStyle(darkened, 1)
            if (latlng) {
              setLinePopup([latlng.lat, latlng.lng])
            }
          },
          mouseover: ({ target }) => {
            if (target && !clicked) {
              target.setStyle({
                color: darkened,
                opacity: 1,
              })
            }
            if (!clicked) {
              applyArrowheadStyle(darkened, 1)
            }
          },
          mouseout: ({ target }) => {
            if (target && !clicked) {
              target.setStyle({
                color,
                opacity: LINE_OPACITY,
              })
            }
            if (!clicked) {
              applyArrowheadStyle(color, LINE_OPACITY)
            }
          },
        }}
        positions={polylinePositions}
        pathOptions={{
          color: isActive ? darkened : color,
          opacity: displayRoute.reversible && isActive ? 1 : LINE_OPACITY,
          weight: 4,
        }}
      />
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
