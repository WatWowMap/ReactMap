// @ts-check
import * as React from 'react'
import { Marker, useMap } from 'react-leaflet'

import { useScanStore } from '@hooks/useStore'
import fallbackIcon from '@components/markers/fallback'

import { calcScanNextCoords } from './calcCoords'

/**
 * @param {{ children: React.ReactNode }} props
 * @returns
 */
export function ScanNextMarker({ children }) {
  const map = useMap()
  const scanLocation = useScanStore((s) => s.scanLocation)

  return (
    <Marker
      draggable
      eventHandlers={{
        dragend({ target, popup }) {
          if (target) {
            const { lat, lng } = target.getLatLng()
            map.panTo([lat, lng])
            useScanStore.setState((prev) => ({
              scanLocation: [lat, lng],
              scanCoords: calcScanNextCoords([lat, lng], prev.scanNextSize),
            }))
          }
          if (popup) {
            popup.openPopup()
          }
        },
      }}
      icon={fallbackIcon()}
      position={scanLocation}
      ref={(ref) => {
        if (ref && !ref.isPopupOpen()) ref.openPopup()
      }}
    >
      {children}
    </Marker>
  )
}
