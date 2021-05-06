import React, { memo } from 'react'
import { Circle } from 'react-leaflet'

const RingTile = ({ ring }) => (
  <Circle
    center={[ring.lat, ring.lon]}
    radius={20}
    interactive={false}
  />
)

const areEqual = (prev, next) => (
  prev.ring.id === next.ring.id
    && prev.ring.lat === next.ring.lat
    && prev.ring.lon === next.ring.lon
)

export default memo(RingTile, areEqual)
