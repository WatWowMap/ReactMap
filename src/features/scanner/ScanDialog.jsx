// @ts-check
import * as React from 'react'
import { useTranslation } from 'react-i18next'

import { Notification } from '@components/Notification'

import { useScanStore } from './hooks/store'

const { setScanMode } = useScanStore.getState()

export function ScanDialog() {
  const { t } = useTranslation()
  const scanNext = useScanStore((s) => s.scanNextMode)
  const scanZone = useScanStore((s) => s.scanZoneMode)

  const scanMode = React.useMemo(
    () => scanNext || scanZone,
    [scanNext, scanZone],
  )

  const handleClose = React.useCallback(() => {
    if (scanNext) return setScanMode('scanNextMode')
    if (scanZone) return setScanMode('scanZoneMode')
  }, [scanNext, scanZone])

  const resultOpen = scanMode === 'confirmed' || scanMode === 'error'
  const resultSeverity = scanMode === 'error' ? 'error' : 'success'

  return (
    <>
      <Notification
        open={scanMode === 'loading'}
        severity="info"
        title="scan_loading_title"
        cb={handleClose}
        autoHideDuration={null}
        ignoreClickaway
      >
        {t('scan_loading')}
      </Notification>
      <Notification
        open={resultOpen}
        severity={resultSeverity}
        title={resultOpen ? `scan_${scanMode}_title` : undefined}
        cb={handleClose}
        ignoreClickaway
      >
        {resultOpen ? t(`scan_${scanMode}`) : null}
      </Notification>
    </>
  )
}
