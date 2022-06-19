import React from 'react'
import { DialogContent, Typography, Divider, Grid } from '@material-ui/core'
import { useTranslation } from 'react-i18next'

const closing = [0, 1, 2, 3, 4]

export default function TutClosing() {
  const { t } = useTranslation()

  return (
    <DialogContent style={{ height: '100%' }}>
      <Grid
        container
        justifyContent="center"
        alignItems="center"
        spacing={2}
        style={{ height: '100%' }}
      >
        {closing.map((i) => (
          <Grid item xs={12} key={i}>
            <Typography variant={i ? 'subtitle1' : 'h5'} align="center">
              {t(`tutorial_closing_${i}`)}
            </Typography>
            <Divider light style={{ margin: 10 }} />
          </Grid>
        ))}
        <Grid item xs={12}>
          <Typography variant="subtitle1" align="center">
            {t('tutorial_closing_5')}
          </Typography>
        </Grid>
      </Grid>
    </DialogContent>
  )
}
