import React, { memo } from 'react'
import { Circle, Popup } from 'react-leaflet'

import PopupContent from '../popups/Portal'
import marker from '../markers/portal'

const PortalTile = ({ item, userSettings, ts }) => (
  <Circle
    key={item.id}
    center={[item.lat, item.lon]}
    radius={20}
    pathOptions={marker(item, ts, userSettings)}
  >
    <Popup position={[item.lat, item.lon]}>
      <PopupContent portal={item} />
    </Popup>
  </Circle>
)

const areEqual = (prev, next) => (
  prev.item.id === next.item.id
  && prev.userSettings.clustering === next.userSettings.clustering
  && prev.userSettings.oldPortals === next.userSettings.oldPortals
  && prev.userSettings.newPortals === next.userSettings.newPortals
)

export default memo(PortalTile, areEqual)
