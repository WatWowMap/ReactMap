/* eslint-disable react/destructuring-assignment */
// @ts-check
import * as React from 'react'
import { Marker, Polyline, Popup, useMapEvents } from 'react-leaflet'
import destination from '@turf/destination'
import distance from '@turf/distance'
import { point as turfPoint } from '@turf/helpers'
import { darken } from '@mui/material/styles'

import { useForcePopup } from '@hooks/useForcePopup'

import { routeMarker } from './routeMarker'
import { RoutePopup } from './RoutePopup'

const POSITIONS = /** @type {const} */ (['start', 'end'])

const LINE_OPACITY = 0.33
const MARKER_OPACITY = LINE_OPACITY * 2
const CHEVRON_SPACING_METERS = 10
const CHEVRON_MIN_LENGTH_METERS = 2
const CHEVRON_MAX_LENGTH_METERS = 5
const CHEVRON_WIDTH_RATIO = 0.75

/** @param {{ lat: number, lng: number }} start @param {{ lat: number, lng: number }} end */
const segmentDistanceInMeters = (start, end) =>
  distance(turfPoint([start.lng, start.lat]), turfPoint([end.lng, end.lat]), {
    units: 'meters',
  })

/** @param {{ lat: number, lng: number }} start @param {{ lat: number, lng: number }} end */
const calculateBearing = (start, end) => {
  const toRadians = (degrees) => (degrees * Math.PI) / 180
  const toDegrees = (radians) => (radians * 180) / Math.PI

  const lat1 = toRadians(start.lat)
  const lat2 = toRadians(end.lat)
  const deltaLon = toRadians(end.lng - start.lng)
  const y = Math.sin(deltaLon) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon)
  const bearing = toDegrees(Math.atan2(y, x))
  return (bearing + 360) % 360
}

/**
 * @param {{ lat: number, lng: number }} origin
 * @param {number} bearing
 * @param {number} distanceMeters
 */
const movePoint = (origin, bearing, distanceMeters) => {
  const result = destination(
    turfPoint([origin.lng, origin.lat]),
    distanceMeters,
    bearing,
    { units: 'meters' },
  )
  const [lng, lat] = result.geometry.coordinates
  return { lat, lng }
}

/**
 * @param {Array<[number, number]>} latLngTuples
 * @returns {Array<Array<[number, number]>>}
 */
const generateChevronSegments = (latLngTuples) => {
  if (!latLngTuples || latLngTuples.length < 2) {
    return []
  }

  const latLngs = latLngTuples.map(([lat, lng]) => ({ lat, lng }))
  const segmentLengths = []
  let totalLength = 0

  for (let index = 0; index < latLngs.length - 1; index += 1) {
    const start = latLngs[index]
    const end = latLngs[index + 1]
    const length = segmentDistanceInMeters(start, end)
    segmentLengths.push(length)
    totalLength += length
  }

  if (totalLength === 0) {
    return []
  }

  const desiredSpacing = CHEVRON_SPACING_METERS
  const chevronCount = Math.max(1, Math.round(totalLength / desiredSpacing))
  const spacingBetweenCenters = totalLength / chevronCount
  const baseLength = spacingBetweenCenters * 0.35
  const denseLength = spacingBetweenCenters * 0.55
  let chevronLength =
    spacingBetweenCenters < CHEVRON_MIN_LENGTH_METERS
      ? denseLength
      : Math.max(CHEVRON_MIN_LENGTH_METERS, baseLength)
  chevronLength = Math.min(CHEVRON_MAX_LENGTH_METERS, chevronLength)
  const chevronHalfLength = chevronLength / 2
  const chevronWidth = chevronLength * CHEVRON_WIDTH_RATIO
  const chevronHalfWidth = chevronWidth / 2

  const chevronCenters = Array.from(
    { length: chevronCount },
    (_, index) => spacingBetweenCenters * index + spacingBetweenCenters / 2,
  )

  const chevrons = []

  chevronCenters.forEach((targetDistance) => {
    let accumulated = 0

    for (let index = 0; index < segmentLengths.length; index += 1) {
      const segmentLength = segmentLengths[index]
      if (!segmentLength) {
        continue
      }

      if (accumulated + segmentLength >= targetDistance) {
        const start = latLngs[index]
        const end = latLngs[index + 1]
        const segmentRatio = (targetDistance - accumulated) / segmentLength
        const center = {
          lat: start.lat + (end.lat - start.lat) * segmentRatio,
          lng: start.lng + (end.lng - start.lng) * segmentRatio,
        }
        const bearing = calculateBearing(start, end)
        const tip = movePoint(center, bearing, chevronHalfLength)
        const backCenter = movePoint(
          center,
          (bearing + 180) % 360,
          chevronHalfLength,
        )
        const backTop = movePoint(
          backCenter,
          (bearing + 90) % 360,
          chevronHalfWidth,
        )
        const backBottom = movePoint(
          backCenter,
          (bearing + 270) % 360,
          chevronHalfWidth,
        )

        chevrons.push([
          [backTop.lat, backTop.lng],
          [tip.lat, tip.lng],
          [backBottom.lat, backBottom.lng],
        ])
        break
      }

      accumulated += segmentLength
    }
  })

  return chevrons
}

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
  /** @type {React.MutableRefObject<import('leaflet').Polyline | undefined>} */
  const chevronRef = React.useRef()

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

  const chevronSegments = React.useMemo(
    () =>
      displayRoute.reversible ? [] : generateChevronSegments(polylinePositions),
    [displayRoute.reversible, polylinePositions],
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
    if (lineRef.current) {
      lineRef.current.setStyle({
        color: clicked || hover ? darkened : color,
        opacity: displayRoute.reversible
          ? clicked || hover
            ? 1
            : LINE_OPACITY
          : 0,
      })
    }
    if (chevronRef.current) {
      chevronRef.current.setStyle({
        color: clicked || hover ? darkened : color,
        opacity: clicked || hover ? 1 : LINE_OPACITY,
      })
    }
  }, [clicked, color, darkened, displayRoute.reversible, hover])

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
                lineRef.current.setStyle({
                  color: darkened,
                  opacity: displayRoute.reversible ? 1 : 0,
                })
              }
              if (chevronRef.current) {
                chevronRef.current.setStyle({ color: darkened, opacity: 1 })
              }
              setHover(position)
            },
            mouseout: () => {
              if (lineRef.current && !clicked) {
                lineRef.current.setStyle({
                  color,
                  opacity: displayRoute.reversible ? LINE_OPACITY : 0,
                })
              }
              if (chevronRef.current && !clicked) {
                chevronRef.current.setStyle({
                  color,
                  opacity: LINE_OPACITY,
                })
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
                opacity: displayRoute.reversible ? 1 : 0,
              })
            }
            if (chevronRef.current) {
              chevronRef.current.setStyle({ color: darkened, opacity: 1 })
            }
            if (latlng) {
              setLinePopup([latlng.lat, latlng.lng])
            }
          },
          mouseover: ({ target }) => {
            if (target && !clicked) {
              target.setStyle({
                color: darkened,
                opacity: displayRoute.reversible ? 1 : 0,
              })
            }
            if (chevronRef.current && !clicked) {
              chevronRef.current.setStyle({ color: darkened, opacity: 1 })
            }
          },
          mouseout: ({ target }) => {
            if (target && !clicked) {
              target.setStyle({
                color,
                opacity: displayRoute.reversible ? LINE_OPACITY : 0,
              })
            }
            if (chevronRef.current && !clicked) {
              chevronRef.current.setStyle({
                color,
                opacity: LINE_OPACITY,
              })
            }
          },
        }}
        positions={polylinePositions}
        pathOptions={{
          color: clicked || hover ? darkened : color,
          opacity: displayRoute.reversible
            ? clicked || hover
              ? 1
              : LINE_OPACITY
            : 0,
          weight: 4,
        }}
      />
      {chevronSegments.length > 0 && (
        <Polyline
          ref={chevronRef}
          positions={chevronSegments}
          pathOptions={{
            color: clicked || hover ? darkened : color,
            opacity: clicked || hover ? 1 : LINE_OPACITY,
            weight: 4,
            lineCap: 'butt',
            lineJoin: 'miter',
          }}
          interactive={false}
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
