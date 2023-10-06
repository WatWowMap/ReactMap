// @ts-check
import * as React from 'react'
import { Marker, useMap } from 'react-leaflet'

import { useScanStore } from '@hooks/useStore'
import fallbackIcon from '@components/markers/fallback'

/**
 * @param {{ children: React.ReactNode }} props
 * @returns
 */
export function ScanOnDemandMarker({ children }) {
  const map = useMap()
  const scanLocation = useScanStore((s) => s.scanLocation)

  return (
    <Marker
      draggable
      eventHandlers={{
        dragend({ target }) {
          if (target) {
            const { lat, lng } = target.getLatLng()
            map.panTo([lat, lng])
            useScanStore.setState({ scanLocation: [lat, lng] })
          }
        },
      }}
      icon={fallbackIcon}
      position={scanLocation}
      ref={(ref) => {
        if (ref && !ref.isPopupOpen()) ref.openPopup()
      }}
    >
      {children}
    </Marker>
  )
}
