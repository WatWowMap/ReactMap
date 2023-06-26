import ErrorBoundary from '@components/ErrorBoundary'
import React, { memo, useRef, useEffect, useState } from 'react'
import { Marker, Popup } from 'react-leaflet'

import deviceMarker from '../markers/device'
import PopupContent from '../popups/Device'
import DevicePoly from '../popups/DevicePoly'

const DeviceTile = ({ item, ts, Icons, userSettings }) => {
  const [poly, setPoly] = useState(false)
  const markerRef = useRef(null)
  const isOnline = ts - item.updated < 900

  useEffect(() => {
    if (poly && markerRef) {
      markerRef.current.openPopup()
    }
  })

  return (
    <Marker
      position={[item.lat, item.lon]}
      icon={deviceMarker(isOnline, Icons)}
      ref={markerRef}
    >
      <Popup
        position={[item.lat, item.lon]}
        onOpen={() => setPoly(true)}
        onClose={() => setPoly(false)}
      >
        <PopupContent device={item} isOnline={isOnline} ts={ts} />
      </Popup>
      {poly && !item.isMad && (
        <ErrorBoundary>
          <DevicePoly device={item} color={userSettings.devicePathColor} />
        </ErrorBoundary>
      )}
    </Marker>
  )
}

const areEqual = (prev, next) =>
  prev.item.type === next.item.type &&
  prev.item.lat === next.item.lat &&
  prev.item.lon === next.item.lon &&
  prev.item.updated === next.item.updated

export default memo(DeviceTile, areEqual)
