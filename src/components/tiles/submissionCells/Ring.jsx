import React, { memo } from 'react'
import { Circle } from 'react-leaflet'

const RingTile = ({ ring, userSettings }) => (
  <Circle
    center={[ring.lat, ring.lon]}
    radius={20}
    interactive={false}
    pathOptions={{
      fillColor: userSettings.poiColor,
      color: userSettings.poiColor,
    }}
  />
)

const areEqual = (prev, next) =>
  prev.ring.id === next.ring.id && prev.zoom === next.zoom

export default memo(RingTile, areEqual)
