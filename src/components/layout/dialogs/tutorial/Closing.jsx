import React from 'react'
import { DialogContent, Typography, Divider, Grid } from '@mui/material'
import { useTranslation } from 'react-i18next'

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
        {[0, 1, 2, 3, 4].map((i) => (
          <React.Fragment key={i}>
            <Grid item xs={12}>
              <Typography variant={i ? 'subtitle1' : 'h4'} align="center">
                {t(`tutorial_closing_${i}`)}
              </Typography>
            </Grid>
            <Divider flexItem style={{ margin: 10, width: '100%' }} />
          </React.Fragment>
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
