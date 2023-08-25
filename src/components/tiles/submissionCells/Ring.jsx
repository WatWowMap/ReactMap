import * as React from 'react'
import { Circle } from 'react-leaflet'

const RingTile = ({ lat, lon, color }) => (
  <Circle
    key={color}
    center={[lat, lon]}
    radius={20}
    interactive={false}
    color={color}
    fillColor={color}
  />
)

const MemoRing = React.memo(RingTile)

export default MemoRing
