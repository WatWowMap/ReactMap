/* eslint-disable react/destructuring-assignment */
// @ts-check
import * as React from 'react'
import { Circle, Popup } from 'react-leaflet'

import { useStorage } from '@store/useStorage'
import { useForcePopup } from '@hooks/useForcePopup'
import { useManualPopupTracker } from '@hooks/useManualPopupTracker'

import { PortalPopup } from './PortalPopup'

/**
 *
 * @param {{ force?: boolean } & import('@rm/types').Portal} portal
 * @returns
 */
const BasePortalTile = (portal) => {
  const [markerRef, setMarkerRef] = React.useState(null)
  const color = useStorage((s) =>
    Date.now() / 1000 - portal.imported > 86400
      ? s.userSettings.wayfarer.oldPortals
      : s.userSettings.wayfarer.newPortals,
  )

  useForcePopup(portal.id, markerRef)
  const handlePopupOpen = useManualPopupTracker('portals', portal.id)

  return (
    <Circle
      key={color}
      ref={setMarkerRef}
      center={[portal.lat, portal.lon]}
      radius={20}
      fillOpacity={0.25}
      color={color}
      fillColor={color}
      eventHandlers={{ popupopen: handlePopupOpen }}
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
