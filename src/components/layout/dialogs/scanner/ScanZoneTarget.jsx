/* eslint-disable react/no-array-index-key */
// @ts-check
import * as React from 'react'
import { Button, ButtonGroup, Slider, List, ListItem } from '@mui/material'
import { point } from '@turf/helpers'
import destination from '@turf/destination'
import { Marker, Popup, useMap } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import { debounce } from 'lodash'

import AdvancedAccordion from '@components/layout/custom/AdvancedAccordion'
import { useScanStore } from '@hooks/useStore'

import {
  InAllowedArea,
  ScanCancel,
  ScanCircles,
  ScanConfirm,
  ScanQueue,
  ScanRequests,
  StyledDivider,
  StyledListItemText,
  StyledSubHeader,
} from './Shared'
import { useCheckValid } from './useCheckValid'

const OPTIONS = /** @type {const} */ ({ units: 'kilometers' })

const RADIUS_CHOICES = /** @type {const} */ (['pokemon', 'gym'])

const BEARINGS = {
  1: 30,
  2: 90,
  3: 150,
  4: 210,
  5: 270,
  6: 330,
}

/**
 *
 * @param {[number, number]} center
 * @param {number} radius
 * @param {number} spacing
 * @param {import('@hooks/useStore').UseScanStore['scanZoneSize']} scanZoneSize
 * @returns
 */
export const calcScanZoneCoords = (center, radius, spacing, scanZoneSize) => {
  const coords = [center]
  let currentPoint = point([center[1], center[0]])
  const distance = radius * 2 * Math.cos(30 * (Math.PI / 180))
  for (let i = 1; i < scanZoneSize + 1; i += 1) {
    let quadrant = 1
    let step = 1
    while (step < 6 * i + 1) {
      currentPoint = destination(
        currentPoint,
        (distance * spacing) / 1000,
        step === 1 ? 330 : BEARINGS[quadrant],
        OPTIONS,
      )
      coords.push([
        currentPoint.geometry.coordinates[1],
        currentPoint.geometry.coordinates[0],
      ])
      quadrant = Math.floor(step / i) + 1
      step += 1
    }
  }
  return coords
}

/**
 *
 * @param {{ children: React.ReactNode }} props
 * @returns
 */
export function ScanZoneTarget({ children }) {
  const map = useMap()
  useCheckValid('scanZone')

  const scanLocation = useScanStore((s) => s.scanLocation)

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
      <Marker
        draggable
        eventHandlers={{
          dragend({ target, popup }) {
            if (target) {
              const { lat, lng } = target.getLatLng()
              map.panTo([lat, lng])
              useScanStore.setState({ scanLocation: [lat, lng] })
              if (popup) {
                popup.openPopup()
              }
            }
          },
        }}
        position={scanLocation}
        ref={(ref) => {
          if (ref) {
            if (!ref.isPopupOpen()) ref.openPopup()
          }
        }}
      >
        {children}
      </Marker>
      <ScanCircles />
    </>
  )
}

/**
 *
 * @param {{
 *  name: keyof import('../../../../../server/src/types').OnlyType<import('@hooks/useStore').UseScanStore, number>,
 * } & import('@mui/material').SliderProps} props
 * @returns
 */
function ScanZoneSlider({ name, ...props }) {
  const value = useScanStore((s) => s[name])

  const handleChange = React.useCallback(
    (_, newValue) => useScanStore.setState({ [name]: newValue }),
    [],
  )

  const debouncedHandleChange = debounce(handleChange, 10)

  return (
    <Slider
      value={value}
      onChange={debouncedHandleChange}
      onChangeCommitted={handleChange}
      valueLabelDisplay="auto"
      {...props}
    />
  )
}

function SizeSelection({ pokemonRadius, gymRadius }) {
  const { t } = useTranslation()
  const userRadius = useScanStore((s) => s.userRadius)

  const handleRadiusChange = React.useCallback(
    (newRadius) => () =>
      useScanStore.setState((prev) => ({
        userRadius: newRadius,
        scanCoords: calcScanZoneCoords(
          prev.scanLocation,
          newRadius,
          prev.userSpacing,
          prev.scanZoneSize,
        ),
      })),
    [],
  )

  return (
    <ButtonGroup size="small" fullWidth>
      {RADIUS_CHOICES.map((item) => {
        const radius = item === 'pokemon' ? pokemonRadius : gymRadius
        return (
          <Button
            key={item}
            onClick={handleRadiusChange(radius)}
            color={radius === userRadius ? 'primary' : 'secondary'}
            variant={radius === userRadius ? 'contained' : 'outlined'}
          >
            {t(item)}
          </Button>
        )
      })}
    </ButtonGroup>
  )
}

/**
 *
 * @param {import('@hooks/useStore').ScanConfig} props
 * @returns
 */
export function ScanZonePopup({
  scannerType,
  maxSize,
  pokemonRadius,
  gymRadius,
  advancedOptions,
  showScanCount,
  showScanQueue,
}) {
  const { t } = useTranslation()

  return (
    <Popup minWidth={90} maxWidth={200} autoPan={false}>
      <List>
        <StyledListItemText
          className="no-leaflet-margin"
          secondary={t('scan_zone_choose')}
        />
        <StyledDivider />
        {scannerType !== 'mad' && (
          <>
            <StyledSubHeader>{t('scan_zone_size')}</StyledSubHeader>
            <ListItem style={{ padding: 0 }}>
              <ScanZoneSlider
                name="scanZoneSize"
                min={1}
                max={maxSize}
                step={1}
              />
            </ListItem>
            <StyledSubHeader>{t('scan_zone_range')}</StyledSubHeader>
            <ListItem style={{ padding: 2 }}>
              <SizeSelection
                pokemonRadius={pokemonRadius}
                gymRadius={gymRadius}
              />
            </ListItem>
            {advancedOptions && (
              <ListItem style={{ padding: '10px 0' }}>
                <AdvancedAccordion>
                  <List
                    style={{
                      textAlign: 'center',
                      padding: 0,
                    }}
                  >
                    <StyledSubHeader>{t('scan_zone_spacing')}</StyledSubHeader>
                    <ScanZoneSlider
                      name="userSpacing"
                      min={1}
                      max={2}
                      step={0.01}
                    />
                    <StyledSubHeader>{t('scan_zone_radius')}</StyledSubHeader>
                    <ScanZoneSlider name="userRadius" min={50} max={900} />
                  </List>
                </AdvancedAccordion>
              </ListItem>
            )}
          </>
        )}
        {showScanCount && <ScanRequests />}
        {showScanQueue && <ScanQueue />}
        <StyledDivider />
        <ScanConfirm mode="scanZone" />
        <InAllowedArea />
        <ScanCancel mode="scanZone" />
      </List>
    </Popup>
  )
}
