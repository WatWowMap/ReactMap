import React from 'react'
import { Circle } from 'react-leaflet'

const RingTile = ({ ring }) => (
  <Circle
    center={[ring.lat, ring.lon]}
    radius={20}
    interactive={false}
  />
)

const areEqual = (prevRing, nextRing) => (
  prevRing.id === nextRing.id
  && prevRing.lat === nextRing.lat
  && prevRing.lon === nextRing.lon
)

export default React.memo(RingTile, areEqual)
