// @ts-check
import * as React from 'react'
import { Circle, Popup } from 'react-leaflet'

import { useStore } from '@hooks/useStore'

import PopupContent from '../popups/Portal'

/**
 *
 * @param {{ force?: boolean } & import('@rm/types').Portal} props
 * @returns
 */
const PortalTile = ({ force, ...portal }) => {
  const [done, setDone] = React.useState(false)
  const markerRef = React.useRef(null)
  const color = useStore((s) =>
    Date.now() / 1000 - portal.imported > 86400
      ? s.userSettings.wayfarer.oldPortals
      : s.userSettings.wayfarer.newPortals,
  )

  React.useEffect(() => {
    if (force && !done && markerRef.current) {
      markerRef.current.openPopup()
      setDone(true)
    }
  }, [force])

  return (
    <Circle
      key={color}
      ref={markerRef}
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

export default React.memo(PortalTile)
