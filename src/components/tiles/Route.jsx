/* eslint-disable no-nested-ternary */
// @ts-check
import * as React from 'react'
import { Marker, Polyline, useMapEvents } from 'react-leaflet'
import { darken } from '@mui/material'

import RoutePopup from '@components/popups/Route'

import routeMarker from '../markers/route'

const POSITIONS = /** @type {const} */ (['start', 'end'])

const LINE_OPACITY = 0.33
const MARKER_OPACITY = LINE_OPACITY * 2

/**
 *
 * @param {{
 *  item: import('types').Route
 *  Icons: InstanceType<typeof import("@services/Icons").default>
 *  map: import("leaflet").Map
 * }} props
 * @returns
 */
const RouteTile = ({ item, Icons }) => {
  const [clicked, setClicked] = React.useState(false)
  const [hover, setHover] = React.useState('')

  /** @type {React.MutableRefObject<import("leaflet").Polyline>} */
  const lineRef = React.useRef()

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

  const [color, darkened] = React.useMemo(
    () => [
      `#${item.image_border_color}`,
      darken(`#${item.image_border_color}`, 0.2),
    ],
    [item.image_border_color],
  )

  useMapEvents({
    click: ({ originalEvent }) => {
      if (!originalEvent.defaultPrevented) {
        setClicked(false)
        setHover('')
      }
    },
  })

  return (
    <>
      {POSITIONS.map((position) => (
        <Marker
          key={position}
          opacity={hover || clicked ? 1 : MARKER_OPACITY}
          zIndexOffset={hover === position ? 2000 : hover || clicked ? 1000 : 0}
          position={[item[`${position}_lat`], item[`${position}_lon`]]}
          icon={routeMarker(Icons.getMisc(`route-${position}`), position)}
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
            {...item}
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
        dashArray={item.reversible ? undefined : '5, 5'}
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

export default React.memo(RouteTile, () => true)
