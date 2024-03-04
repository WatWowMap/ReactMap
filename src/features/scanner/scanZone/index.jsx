// @ts-check
import * as React from 'react'

import { ScanCircles } from '../Shared'
import { useCheckValid } from '../hooks/useCheckValid'
import { ScanZonePopup } from './PopupContent'
import { ScanOnDemandMarker } from '../Marker'
import { ScanOnDemandPopup } from '../Popup'

/**
 *
 * @returns
 */
export default function ScanZone() {
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
