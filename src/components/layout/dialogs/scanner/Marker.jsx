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

  // React.useEffect(() => {
  //   if (scanCoords.length === 1) {
  //     useScanStore.setState((prev) => ({
  //       scanCoords: calcScanZoneCoords(
  //         prev.scanLocation,
  //         prev.userRadius,
  //         prev.userSpacing,
  //         prev.scanZoneSize,
  //       ),
  //     }))
  //   }
  // }, [scanCoords.length])

  return (
    <Marker
      draggable
      eventHandlers={{
        dragend({ target, popup }) {
          if (target) {
            const { lat, lng } = target.getLatLng()
            map.panTo([lat, lng])
            useScanStore.setState({ scanLocation: [lat, lng] })
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
