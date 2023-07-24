import * as React from 'react'
import { Dialog, DialogContent, Grid, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import Header from '@components/layout/general/Header'
import Footer from '@components/layout/general/Footer'

export default function ScanDialog({ scanMode, setScanMode }) {
  const { t } = useTranslation()

  return (
    <Dialog
      onClose={() => setScanMode(false)}
      open={['confirmed', 'loading', 'error'].includes(scanMode)}
      maxWidth="xs"
    >
      <Header
        titles={[`scan_${scanMode}_title`]}
        action={() => setScanMode(false)}
      />
      <DialogContent>
        <Grid item style={{ textAlign: 'center' }}>
          <Typography variant="subtitle1" align="center">
            {t(`scan_${scanMode}`)}
          </Typography>
        </Grid>
      </DialogContent>
      <Footer
        options={[
          {
            name: 'close',
            icon: 'Clear',
            color: 'primary',
            align: 'right',
            action: () => setScanMode(false),
          },
        ]}
      />
    </Dialog>
  )
}
