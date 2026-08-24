import { useCheckValid } from '../hooks/useCheckValid'
import { ScanOnDemandMarker } from '../Marker'
import { ScanOnDemandPopup } from '../Popup'
import { ScanCircles } from '../Shared'
import { ScanZonePopup } from './PopupContent'

/**
 *
 * @returns
 */
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
