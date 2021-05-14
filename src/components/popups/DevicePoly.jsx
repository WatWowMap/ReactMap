import React, { memo } from 'react'
import { Polyline, Polygon } from 'react-leaflet'
import { useMasterfile } from '../../hooks/useStore'

const DevicePoly = ({ device }) => {
  const { map: { theme } } = useMasterfile(state => state.config)

  return (
    <>
      {device.type === 'circle_pokemon'
        ? (
          <Polyline
            positions={device.area}
            pathOptions={{ color: theme.devicePathColor }}
          />
        ) : (
          <Polygon
            positions={device.area}
            pathOptions={{ color: theme.devicePathColor }}
          />
        )}
    </>
  )
}

const areEqual = (prev, next) => (
  prev.device.type === next.device.type
)

export default memo(DevicePoly, areEqual)
