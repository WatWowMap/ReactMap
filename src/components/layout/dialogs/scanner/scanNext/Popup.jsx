// @ts-check
import * as React from 'react'
import { Button, ButtonGroup, List, ListItem } from '@mui/material'
import { Popup } from 'react-leaflet'
import { useTranslation } from 'react-i18next'

import { useScanStore } from '@hooks/useStore'

import {
  InAllowedArea,
  ScanCancel,
  ScanConfirm,
  ScanQueue,
  ScanRequests,
  StyledDivider,
  StyledListItemText,
} from '../Shared'
import { calcScanNextCoords } from './calcCoords'

const SIZES = /** @type {const} */ (['S', 'M', 'XL'])

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
