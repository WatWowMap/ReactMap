import { ScanCircle, ScanCircles } from '../Shared'
import { useCheckValid } from '../hooks/useCheckValid'
import { ScanOnDemandMarker } from '../Marker'
import { ScanOnDemandPopup } from '../Popup'
import { useScanStore } from '../hooks/store'

import { ScanNextPopup } from './PopupContent'

const POKEMON_RADIUS = 70
const GYM_RADIUS = 750

export function ScanNext() {
  useCheckValid('scanNext')

  const scanLocation = useScanStore((s) => s.scanLocation)
  const scanNextSize = useScanStore((s) => s.scanNextSize)

  return (
    <>
      <ScanOnDemandMarker>
        <ScanOnDemandPopup mode="scanNext">
          <ScanNextPopup />
        </ScanOnDemandPopup>
      </ScanOnDemandMarker>
      {scanNextSize === 'M' ? (
        <ScanCircle
          lat={scanLocation[0]}
          lon={scanLocation[1]}
          radius={GYM_RADIUS}
        />
      ) : (
        <ScanCircles radius={GYM_RADIUS} />
      )}
      <ScanCircles radius={POKEMON_RADIUS} />
    </>
  )
}
