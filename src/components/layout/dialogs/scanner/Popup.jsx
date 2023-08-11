// @ts-check
import * as React from 'react'
import List from '@mui/material/List'
import { Popup } from 'react-leaflet'
import { useTranslation } from 'react-i18next'

import {
  InAllowedArea,
  ScanCancel,
  ScanConfirm,
  ScanQueue,
  ScanRequests,
  StyledDivider,
  StyledListItemText,
} from './Shared'

/**
 *
 * @param {import('@hooks/useStore').ScanConfig & { children: React.ReactNode, mode: import('@hooks/useStore').ScanMode }} props
 * @returns
 */
export function ScanOnDemandPopup({
  scannerType,
  showScanCount,
  showScanQueue,
  children,
  mode,
}) {
  const { t } = useTranslation()

  return (
    <Popup minWidth={90} maxWidth={200} autoPan={false}>
      <List>
        <StyledListItemText
          className="no-leaflet-margin"
          secondary={t('scan_next_choose')}
        />
        <StyledDivider />
        {scannerType !== 'mad' && children}
        {showScanCount && <ScanRequests />}
        {showScanQueue && <ScanQueue />}
        <StyledDivider />
        <ScanConfirm mode={mode} />
        <InAllowedArea />
        <ScanCancel mode={mode} />
      </List>
    </Popup>
  )
}
