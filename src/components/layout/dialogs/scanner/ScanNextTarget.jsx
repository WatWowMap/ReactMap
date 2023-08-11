/* eslint-disable react/no-array-index-key */
/* eslint-disable react/destructuring-assignment */
// @ts-check
import * as React from 'react'
import { Button, ButtonGroup, List, ListItem } from '@mui/material'
import { point } from '@turf/helpers'
import destination from '@turf/destination'
import { Marker, Popup, useMap } from 'react-leaflet'
import { useTranslation } from 'react-i18next'

import { useScanStore } from '@hooks/useStore'
import fallbackIcon from '@components/markers/fallback'

import {
  COLORS,
  InAllowedArea,
  ScanCancel,
  ScanCircle,
  ScanCircles,
  ScanConfirm,
  ScanQueue,
  ScanRequests,
  StyledDivider,
  StyledListItemText,
} from './Shared'
import { useCheckValid } from './useCheckValid'

const OPTIONS = /** @type {const} */ ({ units: 'kilometers' })
const SIZES = /** @type {const} */ (['S', 'M', 'XL'])
const POKEMON_RADIUS = 70
const GYM_RADIUS = 750

const DISTANCE = {
  M: POKEMON_RADIUS * 1.732,
  XL: GYM_RADIUS * 1.732,
}

/**
 *
 * @todo Move this to the server
 * @param {[number, number]} center
 * @param {import('@hooks/useStore').UseScanStore['scanNextSize']} size
 * @returns {import('@hooks/useStore').UseScanStore['scanCoords']}
 */
export const calcScanNextCoords = (center, size) => {
  const coords = [center]
  if (size === 'S') return coords
  const start = point([center[1], center[0]])
  return coords.concat(
    [0, 60, 120, 180, 240, 300].map((bearing) => {
      const [lon, lat] = destination(
        start,
        DISTANCE[size] / 1000,
        bearing,
        OPTIONS,
      ).geometry.coordinates
      return [lat, lon]
    }),
  )
}

/**
 * @param {{ children: React.ReactNode }} props
 * @returns
 */
export function ScanNextTarget({ children }) {
  const map = useMap()
  const color = useCheckValid('scanNext')

  const scanLocation = useScanStore((s) => s.scanLocation)
  const scanNextSize = useScanStore((s) => s.scanNextSize)
  return (
    <>
      <Marker
        draggable
        eventHandlers={{
          dragend({ target, popup }) {
            if (target) {
              const { lat, lng } = target.getLatLng()
              map.panTo([lat, lng])
              useScanStore.setState((prev) => ({
                scanLocation: [lat, lng],
                scanCoords: calcScanNextCoords([lat, lng], prev.scanNextSize),
              }))
            }
            if (popup) {
              popup.openPopup()
            }
          },
        }}
        icon={fallbackIcon()}
        position={scanLocation}
        ref={(ref) => {
          if (ref && !ref.isPopupOpen()) ref.openPopup()
        }}
      >
        {children}
      </Marker>
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

/**
 *
 * @param {import('@hooks/useStore').ScanConfig} props
 * @returns
 */
export function ScanNextPopup({ scannerType, showScanCount, showScanQueue }) {
  const { t } = useTranslation()
  const scanNextSize = useScanStore((s) => s.scanNextSize)

  const setSize = React.useCallback(
    (/** @type {typeof SIZES[number]} */ size) => () => {
      useScanStore.setState((prev) => ({
        scanNextSize: size,
        scanCoords: calcScanNextCoords(prev.scanLocation, size),
      }))
    },
    [],
  )

  return (
    <Popup minWidth={90} maxWidth={200} autoPan={false}>
      <List>
        <StyledListItemText
          className="no-leaflet-margin"
          secondary={t('scan_next_choose')}
        />
        <StyledDivider />
        {scannerType !== 'mad' && (
          <ListItem>
            <ButtonGroup size="small" fullWidth>
              {SIZES.map((size) => (
                <Button
                  key={size}
                  onClick={setSize(size)}
                  color={size === scanNextSize ? 'primary' : 'secondary'}
                  variant={size === scanNextSize ? 'contained' : 'outlined'}
                >
                  {t(size)}
                </Button>
              ))}
            </ButtonGroup>
          </ListItem>
        )}
        {showScanCount && <ScanRequests />}
        {showScanQueue && <ScanQueue />}
        <StyledDivider />
        <ScanConfirm mode="scanNext" />
        <InAllowedArea />
        <ScanCancel mode="scanNext" />
      </List>
    </Popup>
  )
}
