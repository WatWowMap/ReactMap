// @ts-check
/* eslint-disable react/destructuring-assignment */
import ErrorBoundary from '@components/ErrorBoundary'
import * as React from 'react'
import { Marker, Popup } from 'react-leaflet'

import { basicEqualFn, useMemory } from '@store/useMemory'

import { deviceMarker } from './deviceMarker'
import { DevicePath } from './DevicePath'
import { DevicePopup } from './DevicePopup'

/**
 *
 * @param {import('@rm/types').Device} device
 * @returns
 */
const BaseDeviceTile = (device) => {
  const ts = Math.floor(Date.now() / 1000)
  const [poly, setPoly] = React.useState(false)
  const markerRef = React.useRef(null)
  const isOnline = ts - device.updated < 900
  const [iconUrl, iconSize, modifiers] = useMemory(
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
      position={[device.lat, device.lon]}
      icon={icon}
      ref={markerRef}
      eventHandlers={{
        popupopen: () => setPoly(true),
        popupclose: () => setPoly(false),
      }}
    >
      <Popup position={[device.lat, device.lon]}>
        <DevicePopup {...device} isOnline={isOnline} ts={ts} />
      </Popup>
      {poly && !device.isMad && (
        <ErrorBoundary>
          <DevicePath {...device} />
        </ErrorBoundary>
      )}
    </Marker>
  )
}

export const DeviceTile = React.memo(
  BaseDeviceTile,
  (prev, next) => prev.updated === next.updated,
)
