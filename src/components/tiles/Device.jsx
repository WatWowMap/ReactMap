import React, {
  memo, useRef, useEffect, useState,
} from 'react'
import { Marker, Popup } from 'react-leaflet'

import deviceMarker from '../markers/device'
import PopupContent from '../popups/Device'
import DevicePoly from '../popups/DevicePoly'

const DeviceTile = ({
  item, ts, Icons, userSettings,
}) => {
  const [poly, setPoly] = useState(false)
  const markerRef = useRef(null)
  const status = ts - item.last_seen < 900 ? 'online' : 'offline'

  useEffect(() => {
    if (poly && markerRef) {
      markerRef.current.openPopup()
    }
  })

  return (
    <Marker
      position={[item.last_lat, item.last_lon]}
      icon={deviceMarker(status, Icons)}
      ref={markerRef}
    >
      <Popup
        position={[item.last_lat, item.last_lon]}
        onOpen={() => setPoly(true)}
        onClose={() => setPoly(false)}
      >
        <PopupContent
          device={item}
          status={status}
          ts={ts}
        />
      </Popup>
      {(poly && !item.isMad) && <DevicePoly device={item} color={userSettings.devicePathColor} />}
    </Marker>
  )
}

const areEqual = (prev, next) => (
  prev.item.type === next.item.type
  && prev.item.last_lat === next.item.last_lat
  && prev.item.last_lon === next.item.last_lon
  && prev.item.last_seen === next.item.last_seen
)

export default memo(DeviceTile, areEqual)
