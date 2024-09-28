import { ScanCircles } from '../Shared'
import { useCheckValid } from '../hooks/useCheckValid'
import { ScanOnDemandMarker } from '../Marker'
import { ScanOnDemandPopup } from '../Popup'

import { ScanZonePopup } from './PopupContent'

export function ScanZone() {
  useCheckValid('scanZone')

  return (
    <>
      <ScanOnDemandMarker>
        <ScanOnDemandPopup mode="scanZone">
          <ScanZonePopup />
        </ScanOnDemandPopup>
      </ScanOnDemandMarker>
      <ScanCircles />
    </>
  )
}
