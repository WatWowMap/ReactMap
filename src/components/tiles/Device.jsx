import React, { memo, useState } from 'react'
import { Marker, Popup } from 'react-leaflet'

import DevicePoly from '../popups/DevicePoly'
import deviceMarker from '../markers/device'
import PopupContent from '../popups/Device'

const DeviceTile = ({
  item, ts, iconSizes, userSettings,
}) => {
  const [poly, setPoly] = useState(false)
  const status = ts - item.last_seen < 900 ? '0' : '1'

  return (
    <Marker
      position={[item.last_lat, item.last_lon]}
      icon={deviceMarker(status, iconSizes)}
    >
      <Popup
        position={[item.last_lat, item.last_lon]}
        onOpen={() => setPoly(true)}
        onClose={() => setPoly(false)}
      >
        <PopupContent
          device={item}
          status={parseInt(status)}
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
  && prev.userSettings.devicePathColor === next.userSettings.devicePathColor
)

export default memo(DeviceTile, areEqual)
