import { Marker, useMap } from 'react-leaflet'

import { fallbackMarker } from '@assets/fallbackMarker'

import { useScanStore } from './hooks/store'

export function ScanOnDemandMarker({
  children,
}: {
  children: React.ReactNode
}) {
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
      icon={fallbackMarker}
      position={scanLocation}
      ref={(ref) => {
        if (ref && !ref.isPopupOpen()) ref.openPopup()
      }}
    >
      {children}
    </Marker>
  )
}
