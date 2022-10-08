import * as React from 'react'
import { Dialog, DialogContent, Grid, Typography } from '@material-ui/core'
import { useTranslation } from 'react-i18next'
import Header from '@components/layout/general/Header'
import Footer from '@components/layout/general/Footer'

export default function ScanDialog({ scanNextMode, setScanNextMode }) {
  const { t } = useTranslation()

  return (
    <Dialog
      onClose={() => setScanNextMode(false)}
      open={['confirmed', 'loading', 'error'].includes(scanNextMode)}
      maxWidth="xs"
    >
      <Header
        titles={[`scan_${scanNextMode}_title`]}
        action={() => setScanNextMode(false)}
      />
      <DialogContent>
        <Grid item style={{ textAlign: 'center' }}>
          <Typography variant="subtitle1" align="center">
            {t(`scan_${scanNextMode}`)}
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
            action: () => setScanNextMode(false),
          },
        ]}
      />
    </Dialog>
  )
}
