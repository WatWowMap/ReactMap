// @ts-check
import * as React from 'react'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'

import { Header } from '@components/dialogs/Header'
import { Footer } from '@components/dialogs/Footer'
import { SCAN_MODES } from '@assets/constants'

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

  const footerOptions = React.useMemo(
    () =>
      /** @type {import('@components/dialogs/Footer').FooterButton[]} */ ([
        {
          name: 'close',
          icon: 'Clear',
          color: 'primary',
          align: 'right',
          action: handleClose,
        },
      ]),
    [handleClose],
  )

  return (
    <Dialog
      onClose={handleClose}
      open={SCAN_MODES.includes(scanMode)}
      maxWidth="xs"
    >
      <Header titles={[`scan_${scanMode}_title`]} action={handleClose} />
      <DialogContent className="flex-center" sx={{ mt: 2 }}>
        <Typography variant="subtitle1" align="center">
          {scanMode && t(`scan_${scanMode}`)}
        </Typography>
      </DialogContent>
      <Footer role="alertdialog" options={footerOptions} />
    </Dialog>
  )
}
