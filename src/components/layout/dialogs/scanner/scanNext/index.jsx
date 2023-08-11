/* eslint-disable react/no-array-index-key */
/* eslint-disable react/destructuring-assignment */
// @ts-check
import * as React from 'react'

import { useScanStore } from '@hooks/useStore'

import { COLORS, ScanCircle, ScanCircles } from '../Shared'
import { useCheckValid } from '../useCheckValid'
import { ScanNextMarker } from './Marker'
import { ScanNextPopup } from './Popup'

const POKEMON_RADIUS = 70
const GYM_RADIUS = 750

/**
 * @param {import('@hooks/useStore').ScanConfig} props
 * @returns {JSX.Element}
 */
export default function ScanNext(props) {
  const color = useCheckValid('scanNext')

  const scanLocation = useScanStore((s) => s.scanLocation)
  const scanNextSize = useScanStore((s) => s.scanNextSize)
  return (
    <>
      <ScanNextMarker>
        <ScanNextPopup {...props} />
      </ScanNextMarker>
      {scanNextSize === 'M' ? (
        <ScanCircle
          lat={scanLocation[0]}
          lon={scanLocation[1]}
          radius={GYM_RADIUS}
          color={COLORS.orange}
        />
      ) : (
        <ScanCircles radius={GYM_RADIUS} color={color} />
      )}
      <ScanCircles radius={POKEMON_RADIUS} />
    </>
  )
}
