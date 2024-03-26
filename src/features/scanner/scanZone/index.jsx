// @ts-check
import * as React from 'react'

import { ScanCircles } from '../Shared'
import { useCheckValid } from '../hooks/useCheckValid'
import { ScanZonePopup } from './PopupContent'
import { ScanOnDemandMarker } from '../Marker'
import { ScanZoneOnDemandPopup } from '../Popup'

/**
 *
 * @returns
 */
export function ScanZone() {
  useCheckValid('scanZone')

  return (
    <>
      <ScanOnDemandMarker>
        <ScanZoneOnDemandPopup mode="scanZone">
          <ScanZonePopup />
        </ScanZoneOnDemandPopup>
      </ScanOnDemandMarker>
      <ScanCircles />
    </>
  )
}
