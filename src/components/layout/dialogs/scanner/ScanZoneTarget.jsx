/* eslint-disable react/no-array-index-key */
// @ts-check
import * as React from 'react'
import {
  Button,
  ButtonGroup,
  Slider,
  List,
  ListItem,
  ListSubheader,
} from '@mui/material'
import { point } from '@turf/helpers'
import destination from '@turf/destination'
import { Marker, Popup, useMap } from 'react-leaflet'
import { useTranslation } from 'react-i18next'

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
} from './Shared'
import { useCheckValid } from './useCheckValid'

const OPTIONS = /** @type {const} */ ({ units: 'kilometers' })

const RADIUS_CHOICES = /** @type {const} */ (['pokemon', 'gym'])

/**
 *
 * @param {[number, number]} center
 * @param {number} radius
 * @param {number} spacing
 * @param {import('@hooks/useStore').UseScanStore['scanZoneSize']} scanZoneSize
 * @returns
 */
const calcScanZoneCoords = (center, radius, spacing, scanZoneSize) => {
  let coords = [center]
  let currentPoint = point([center[1], center[0]])
  const distance = radius * 2 * Math.cos(30 * (Math.PI / 180))
  const bearings = {
    1: 30,
    2: 90,
    3: 150,
    4: 210,
    5: 270,
    6: 330,
  }
  for (let i = 1; i < scanZoneSize + 1; i += 1) {
    let quadrant = 1
    let step = 1
    while (step < 6 * i + 1) {
      currentPoint = destination(
        currentPoint,
        (distance * spacing) / 1000,
        step === 1 ? 330 : bearings[quadrant],
        OPTIONS,
      )
      coords = coords.concat([
        [
          currentPoint.geometry.coordinates[1],
          currentPoint.geometry.coordinates[0],
        ],
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
              useScanStore.setState((prev) => ({
                scanLocation: [lat, lng],
                scanCoords: calcScanZoneCoords(
                  [lat, lng],
                  prev.userRadius,
                  prev.userSpacing,
                  prev.scanZoneSize,
                ),
              }))
              if (popup) {
                popup.openPopup()
              }
            }
          },
        }}
        position={scanLocation}
        ref={(ref) => {
          if (ref && !ref.isPopupOpen()) ref.openPopup()
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

  const userSpacing = useScanStore((s) => s.userSpacing)
  const scanZoneSize = useScanStore((s) => s.scanZoneSize)
  const userRadius = useScanStore((s) => s.userRadius)

  const handleSizeChange = React.useCallback(
    (_, newSize) =>
      useScanStore.setState((prev) => ({
        scanZoneSize: newSize,
        scanCoords: calcScanZoneCoords(
          prev.scanLocation,
          prev.userRadius,
          prev.userSpacing,
          newSize,
        ),
      })),
    [],
  )

  const handleSpacingChange = React.useCallback(
    (_, newSpacing) =>
      useScanStore.setState((prev) => ({
        userSpacing: newSpacing,
        scanCoords: calcScanZoneCoords(
          prev.scanLocation,
          prev.userRadius,
          newSpacing,
          prev.scanZoneSize,
        ),
      })),
    [],
  )

  const handleRadiusChange = React.useCallback(
    (_, newRadius) =>
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
    <Popup minWidth={90} maxWidth={200} autoPan={false}>
      <List>
        <StyledListItemText
          className="no-leaflet-margin"
          secondary={t('scan_zone_choose')}
        />
        <StyledDivider />
        {scannerType !== 'mad' && (
          <>
            <ListSubheader disableSticky style={{ lineHeight: 2 }}>
              {t('scan_zone_size')}
            </ListSubheader>
            <ListItem style={{ padding: 0 }}>
              <Slider
                name="Size"
                min={1}
                max={maxSize}
                step={1}
                value={scanZoneSize}
                onChange={handleSizeChange}
              />
            </ListItem>
            <ListSubheader disableSticky style={{ lineHeight: 2 }}>
              {t('scan_zone_range')}
            </ListSubheader>
            <ListItem style={{ padding: 2 }}>
              <ButtonGroup size="small" fullWidth>
                {RADIUS_CHOICES.map((item) => {
                  const radius = item === 'pokemon' ? pokemonRadius : gymRadius
                  return (
                    <Button
                      key={item}
                      onClick={() => handleRadiusChange(null, radius)}
                      color={radius === userRadius ? 'primary' : 'secondary'}
                      variant={radius === userRadius ? 'contained' : 'outlined'}
                    >
                      {t(item)}
                    </Button>
                  )
                })}
              </ButtonGroup>
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
                    <ListSubheader disableSticky style={{ lineHeight: 2 }}>
                      {t('scan_zone_spacing')}
                    </ListSubheader>
                    <Slider
                      name="Spacing"
                      min={1}
                      max={2}
                      step={0.01}
                      value={userSpacing}
                      onChange={handleSpacingChange}
                      style={{ margin: 0, padding: 0 }}
                    />
                    <ListSubheader disableSticky style={{ lineHeight: 2 }}>
                      {t('scan_zone_radius')}
                    </ListSubheader>
                    <Slider
                      name="Radius"
                      min={50}
                      max={900}
                      value={userRadius}
                      onChange={handleRadiusChange}
                      valueLabelDisplay="auto"
                    />
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
