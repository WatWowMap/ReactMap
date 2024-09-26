import { ScanCircles } from '../Shared'
import { useCheckValid } from '../hooks/useCheckValid'
import { ScanZonePopup } from './PopupContent'
import { ScanOnDemandMarker } from '../Marker'
import { ScanOnDemandPopup } from '../Popup'

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
