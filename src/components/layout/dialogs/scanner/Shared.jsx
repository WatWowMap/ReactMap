import * as React from 'react'
import {
  ListItemText,
  ListItem,
  ListItemIcon,
  withStyles,
} from '@material-ui/core'
import PermScanWifiIcon from '@material-ui/icons/PermScanWifi'
import ClearIcon from '@material-ui/icons/Clear'
import { useStore } from '@hooks/useStore'

import { Trans, useTranslation } from 'react-i18next'

const StyledListItem = withStyles({
  root: {
    padding: '2px 16px',
  },
})(ListItem)

export function ScanRequests({ amount = 0 }) {
  const { t } = useTranslation()
  return (
    <StyledListItem style={{ margin: 0 }} className="no-leaflet-margin">
      <ListItemText secondary={`${t('scan_requests')}:`} />
      <ListItemText style={{ textAlign: 'center' }} secondary={amount} />
    </StyledListItem>
  )
}

export function ScanQueue({ queue = 0 }) {
  const { t } = useTranslation()
  return (
    <StyledListItem className="no-leaflet-margin">
      <ListItemText secondary={`${t('scan_queue')}:`} />
      <ListItemText
        style={{ textAlign: 'center' }}
        secondary={`${queue || '...'}`}
      />
    </StyledListItem>
  )
}

export function ScanConfirm({ isInAllowedArea, setMode, areaRestrictions }) {
  const { t } = useTranslation()
  const scannerCooldown = useStore((s) => s.scannerCooldown)

  return (
    <StyledListItem
      button
      color="secondary"
      disabled={
        !!(areaRestrictions?.length && !isInAllowedArea) || !!scannerCooldown
      }
      onClick={() => setMode('sendCoords')}
    >
      <ListItemIcon>
        <PermScanWifiIcon color="secondary" />
      </ListItemIcon>
      <ListItemText
        primary={
          scannerCooldown ? (
            <Trans
              i18nKey="scanner_countdown"
              values={{ time: scannerCooldown }}
            />
          ) : (
            t('click_to_scan')
          )
        }
      />
    </StyledListItem>
  )
}

export function InAllowedArea({ isInAllowedArea }) {
  const { t } = useTranslation()
  return (
    <ListItemText
      secondary={t('scan_outside_area')}
      style={{ display: isInAllowedArea ? 'none' : 'block' }}
    />
  )
}

export function ScanCancel({ setMode }) {
  const { t } = useTranslation()
  return (
    <StyledListItem button onClick={() => setMode(false)}>
      <ListItemIcon>
        <ClearIcon color="primary" />
      </ListItemIcon>
      <ListItemText primary={t('cancel')} />
    </StyledListItem>
  )
}
