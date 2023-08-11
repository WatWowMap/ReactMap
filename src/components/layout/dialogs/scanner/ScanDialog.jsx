// @ts-check
import * as React from 'react'
import { Dialog, DialogContent, Grid, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import Header from '@components/layout/general/Header'
import Footer from '@components/layout/general/Footer'
import { useScanStore } from '@hooks/useStore'

const { setScanMode } = useScanStore.getState()

export default function ScanDialog() {
  const { t } = useTranslation()
  const [scanNext, scanZone] = useScanStore((s) => [
    s.scanNextMode,
    s.scanZoneMode,
  ])

  const scanMode = React.useMemo(
    () => scanNext || scanZone,
    [scanNext, scanZone],
  )

  const handleClose = React.useCallback(() => {
    if (scanMode) return setScanMode('scanNextMode')
    if (scanZone) return setScanMode('scanZoneMode')
  }, [scanMode])

  return (
    <Dialog
      onClose={handleClose}
      open={['confirmed', 'loading', 'error'].includes(scanMode)}
      maxWidth="xs"
    >
      <Header titles={[`scan_${scanMode}_title`]} action={handleClose} />
      <DialogContent>
        <Grid item style={{ textAlign: 'center' }}>
          <Typography variant="subtitle1" align="center">
            {t(`scan_${scanMode}`)}
          </Typography>
        </Grid>
      </DialogContent>
      <Footer
        role="alertdialog"
        options={[
          {
            name: 'close',
            icon: 'Clear',
            color: 'primary',
            align: 'right',
            action: handleClose,
          },
        ]}
      />
    </Dialog>
  )
}
