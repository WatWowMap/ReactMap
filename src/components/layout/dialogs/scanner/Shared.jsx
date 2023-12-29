/* eslint-disable no-nested-ternary */
// @ts-check
import * as React from 'react'
import {
  ListItemText,
  ListItem,
  ListItemIcon,
  styled,
  ListItemButton,
  Divider,
  ListSubheader,
} from '@mui/material'
import { Trans, useTranslation } from 'react-i18next'
import { Circle } from 'react-leaflet'
import PermScanWifiIcon from '@mui/icons-material/PermScanWifi'
import ClearIcon from '@mui/icons-material/Clear'

import { useScanStore, useScannerSessionStorage } from './store'

const StyledListItem = styled(ListItem)(() => ({
  padding: '2px 16px',
}))

export const StyledListItemText = styled(ListItemText)(() => ({
  textAlign: 'center',
}))

const StyledListButton = styled(ListItemButton)(() => ({
  padding: '2px 16px',
}))

export const StyledDivider = styled(Divider)(() => ({
  margin: '10px 0',
}))

export const StyledSubHeader = styled(ListSubheader)(() => ({
  lineHeight: 2,
}))

const { setScanMode } = useScanStore.getState()

export const COLORS = /** @type {const} */ ({
  blue: 'rgb(90, 145, 255)',
  orange: 'rgb(255, 165, 0)',
  red: 'rgb(255, 100, 90)',
  purple: 'rgb(200, 100, 255)',
})

export function ScanRequests() {
  const { t } = useTranslation()
  const amount = useScanStore((s) => s.scanCoords.length)
  return (
    <StyledListItem style={{ margin: 0 }} className="no-leaflet-margin">
      <ListItemText secondary={`${t('scan_requests')}:`} />
      <StyledListItemText secondary={amount} />
    </StyledListItem>
  )
}

export function ScanQueue() {
  const { t } = useTranslation()
  const queue = useScanStore((s) => s.queue)
  return (
    <StyledListItem className="no-leaflet-margin">
      <ListItemText secondary={`${t('scan_queue')}:`} />
      <StyledListItemText secondary={queue} />
    </StyledListItem>
  )
}

/**
 *
 * @param {{ mode: import('./store').ScanMode }} props
 * @returns
 */
export function ScanConfirm({ mode }) {
  const { t } = useTranslation()
  const cooldown = useScannerSessionStorage((s) => s.cooldown)
  const valid = useScanStore((s) => s.valid)
  const estimatedDelay = useScanStore((s) => s.estimatedDelay)

  const [remainder, setRemainder] = React.useState(cooldown - Date.now())

  React.useEffect(() => {
    if (cooldown - Date.now() > 0) {
      const interval = setTimeout(() => {
        setRemainder(cooldown - Date.now())
      }, 1000)
      return () => clearTimeout(interval)
    }
    setRemainder(0)
  }, [remainder, cooldown])

  return (
    <StyledListButton
      color="secondary"
      disabled={valid === 'none' || remainder > 0}
      onClick={() => setScanMode(`${mode}Mode`, 'sendCoords')}
    >
      <ListItemIcon>
        <PermScanWifiIcon color="secondary" />
      </ListItemIcon>
      <ListItemText
        primary={
          remainder > 0 ? (
            <Trans
              i18nKey="scanner_countdown"
              values={{ time: Math.round(remainder / 1000) }}
            />
          ) : (
            t('click_to_scan')
          )
        }
        secondary={estimatedDelay ? `${estimatedDelay}s ${t('cooldown')}` : ''}
        secondaryTypographyProps={{ component: 'span' }}
      />
    </StyledListButton>
  )
}

export function InAllowedArea() {
  const { t } = useTranslation()
  const valid = useScanStore((s) => s.valid)
  return {
    none: <StyledListItemText secondary={t('scan_outside_area')} />,
    some: <StyledListItemText secondary={t('scan_some_outside_area')} />,
    all: null,
  }[valid]
}

/**
 *
 * @param {{ mode: import('./store').ScanMode}} props
 * @returns
 */
export function ScanCancel({ mode }) {
  const { t } = useTranslation()
  return (
    <StyledListButton onClick={() => setScanMode(`${mode}Mode`, '')}>
      <ListItemIcon>
        <ClearIcon color="primary" />
      </ListItemIcon>
      <ListItemText primary={t('cancel')} />
    </StyledListButton>
  )
}

/**
 *
 * @param {{ radius: number, lat: number, lon: number, color?: string }} props
 * @returns
 */
export function ScanCircle({ lat, lon, radius, color = COLORS.blue }) {
  return (
    <Circle
      radius={radius}
      center={[lat, lon]}
      fillOpacity={0.1}
      color={color}
      fillColor={color}
    />
  )
}

/**
 *
 * @param {{ radius?: number }} props
 * @returns
 */
export function ScanCircles({ radius }) {
  const scanCoords = useScanStore((s) => s.scanCoords)
  const userRadius = useScanStore((s) => s.userRadius)
  const validCoords = useScanStore((s) => s.validCoords)

  const finalRadius = radius || userRadius
  return scanCoords.map((coords, i) => {
    const finalColor =
      finalRadius <= 70
        ? validCoords[i]
          ? COLORS.orange
          : COLORS.purple
        : validCoords[i]
        ? COLORS.blue
        : COLORS.red
    return (
      <ScanCircle
        key={`${coords.join('')}${finalColor}`}
        radius={finalRadius}
        lat={coords[0]}
        lon={coords[1]}
        color={finalColor}
      />
    )
  })
}
