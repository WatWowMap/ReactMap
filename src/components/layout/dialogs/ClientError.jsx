import React from 'react'
import { Dialog, Typography, DialogContent, Button } from '@material-ui/core'
import { Refresh } from '@material-ui/icons'
import { useTranslation } from 'react-i18next'

import Header from '../general/Header'

export default function ClientError({ error }) {
  const { t } = useTranslation()
  return (
    <Dialog open={Boolean(error)}>
      <Header titles={[`${error}_title`]} />
      <DialogContent style={{ textAlign: 'center', whiteSpace: 'pre-line' }}>
        <br />
        <Typography variant="h6">
          {t(`${error}_body`)}
        </Typography>
        <br />
        <Typography variant="h6">
          {t('refresh_to_continue')}
        </Typography>
        <br />
        <Button
          onClick={() => window.location.reload(true)}
          variant="contained"
          color="primary"
          style={{ marginBottom: 20 }}
          startIcon={<Refresh />}
        >
          {t('refresh')}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
