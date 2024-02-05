/* eslint-disable react/destructuring-assignment */
// @ts-check
import * as React from 'react'
import { Circle, Popup } from 'react-leaflet'

import { useStorage } from '@hooks/useStorage'
import useForcePopup from '@hooks/useForcePopup'

import PopupContent from '../popups/Portal'

/**
 *
 * @param {{ force?: boolean } & import('@rm/types').Portal} portal
 * @returns
 */
const PortalTile = (portal) => {
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
      radius={20}
      fillOpacity={0.25}
      color={color}
      fillColor={color}
    >
      <Popup position={[portal.lat, portal.lon]}>
        <PopupContent {...portal} />
      </Popup>
    </Circle>
  )
}

const MemoPortalTile = React.memo(
  PortalTile,
  (prev, next) => prev.updated === next.updated,
)

export default MemoPortalTile
