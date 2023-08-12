/* eslint-disable react/no-array-index-key */
// @ts-check
import * as React from 'react'

import { ScanCircles } from '../Shared'
import { useCheckValid } from '../useCheckValid'
import { ScanZonePopup } from './PopupContent'
import { ScanOnDemandMarker } from '../Marker'
import { ScanOnDemandPopup } from '../Popup'

/**
 *
 * @returns
 */
export default function ScanZone() {
  useCheckValid('scanZone')

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
