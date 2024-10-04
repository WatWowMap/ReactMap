import * as React from 'react'
import { Circle, Popup } from 'react-leaflet'
import { useStorage } from '@store/useStorage'
import { useForcePopup } from '@hooks/useForcePopup'

import { PortalPopup } from './PortalPopup'

const BasePortalTile = (
  portal: { force?: boolean } & import('@rm/types').Portal,
) => {
  const [markerRef, setMarkerRef] = React.useState(null)
  const color = useStorage((s) =>
    Date.now() / 1000 - portal.imported > 86400
      ? s.userSettings.wayfarer.oldPortals
      : s.userSettings.wayfarer.newPortals,
  )

  useForcePopup(portal.id, markerRef)

  return (
    <Circle
      key={color}
      ref={setMarkerRef}
      center={[portal.lat, portal.lon]}
      color={color}
      fillColor={color}
      fillOpacity={0.25}
      radius={20}
    >
      <Popup position={[portal.lat, portal.lon]}>
        <PortalPopup {...portal} />
      </Popup>
    </Circle>
  )
}

export const PortalTile = React.memo(
  BasePortalTile,
  (prev, next) => prev.updated === next.updated,
)
