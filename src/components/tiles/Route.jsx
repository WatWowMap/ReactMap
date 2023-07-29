/* eslint-disable no-nested-ternary */
// @ts-check
import * as React from 'react'
import { Marker, Polyline, useMapEvents } from 'react-leaflet'
import { darken } from '@mui/material'

import ErrorBoundary from '@components/ErrorBoundary'
import RoutePopup from '@components/popups/Route'

import routeMarker from '../markers/route'

const POSITIONS = /** @type {const} */ (['start', 'end'])

const OPACITY = 0.66

/**
 *
 * @param {{
 *  item: import('../../../server/src/types').Route
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
      darken(`#${item.image_border_color}`, 0.3),
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
    /** @param {{ target: import('leaflet').Map }} args */
    zoom: ({ target }) => {
      const pane = target.getPane('routes')
      if (pane) {
        pane.hidden = target.getZoom() < 13
      }
    },
  })

  return (
    <>
      {POSITIONS.map((position) => (
        <Marker
          key={position}
          opacity={hover || clicked ? 1 : OPACITY}
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
                lineRef.current.setStyle({ color, opacity: OPACITY })
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
      <ErrorBoundary>
        <Polyline
          ref={lineRef}
          pane="routes"
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
                target.setStyle({ color, opacity: OPACITY })
              }
            },
          }}
          dashArray={item.reversible ? undefined : '5, 5'}
          positions={waypoints.map((waypoint) => [
            waypoint.lat_degrees,
            waypoint.lng_degrees,
          ])}
          pathOptions={{
            color: clicked ? darkened : color,
            opacity: clicked || hover ? 1 : OPACITY,
          }}
        />
      </ErrorBoundary>
    </>
  )
}

export default React.memo(RouteTile, () => true)
