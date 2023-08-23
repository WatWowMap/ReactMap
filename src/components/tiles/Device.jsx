// @ts-check
/* eslint-disable react/destructuring-assignment */
import ErrorBoundary from '@components/ErrorBoundary'
import * as React from 'react'
import { Marker, Popup } from 'react-leaflet'

import { basicEqualFn, useStatic } from '@hooks/useStore'

import deviceMarker from '../markers/device'
import PopupContent from '../popups/Device'
import DevicePoly from '../popups/DevicePoly'

/**
 *
 * @param {import('@rm/types').Device} props
 * @returns
 */
const DeviceTile = (props) => {
  const ts = Math.floor(Date.now() / 1000)
  const [poly, setPoly] = React.useState(false)
  const markerRef = React.useRef(null)
  const isOnline = ts - props.updated < 900
  const [iconUrl, iconSize, modifiers] = useStatic(
    (s) => [
      s.Icons.getDevices(isOnline),
      s.Icons.getSize('device'),
      s.Icons.getModifiers('device')[0],
    ],
    basicEqualFn,
  )

  React.useEffect(() => {
    if (poly && markerRef) {
      markerRef.current.openPopup()
    }
  })

  const icon = React.useMemo(
    () => deviceMarker(iconUrl, iconSize, modifiers),
    [iconUrl, iconSize],
  )

  return (
    <Marker
      position={[props.lat, props.lon]}
      icon={icon}
      ref={markerRef}
      eventHandlers={{
        popupopen: () => setPoly(true),
        popupclose: () => setPoly(false),
      }}
    >
      <Popup position={[props.lat, props.lon]}>
        <PopupContent {...props} isOnline={isOnline} ts={ts} />
      </Popup>
      {poly && !props.isMad && (
        <ErrorBoundary>
          <DevicePoly {...props} />
        </ErrorBoundary>
      )}
    </Marker>
  )
}

const MemoDevice = React.memo(DeviceTile, () => true)

export default MemoDevice
