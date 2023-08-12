/* eslint-disable react/no-array-index-key */
/* eslint-disable react/destructuring-assignment */
// @ts-check
import * as React from 'react'

import { useScanStore } from '@hooks/useStore'

import { ScanCircle, ScanCircles } from '../Shared'
import { useCheckValid } from '../useCheckValid'
import { ScanNextPopup } from './PopupContent'
import { ScanOnDemandMarker } from '../Marker'
import { ScanOnDemandPopup } from '../Popup'

const POKEMON_RADIUS = 70
const GYM_RADIUS = 750

/**
 * @returns {JSX.Element}
 */
export default function ScanNext() {
  const color = useCheckValid('scanNext')

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
          color={color}
        />
      ) : (
        <ScanCircles radius={GYM_RADIUS} />
      )}
      <ScanCircles radius={POKEMON_RADIUS} color={color} />
    </>
  )
}
