import React, { memo } from 'react'
import { Circle, Popup } from 'react-leaflet'

import PopupContent from '../popups/Portal'
import marker from '../markers/portal'

const PortalTile = ({ item }) => (
  <Circle
    key={item.id}
    center={[item.lat, item.lon]}
    radius={20}
    pathOptions={marker(item)}
  >
    <Popup position={[item.lat, item.lon]}>
      <PopupContent portal={item} />
    </Popup>
  </Circle>
)

const areEqual = (prev, next) => (
  prev.item.id === next.item.id
)

export default memo(PortalTile, areEqual)
