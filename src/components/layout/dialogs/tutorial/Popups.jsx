import React from 'react'
import {
  Grid, DialogContent, Typography,
} from '@material-ui/core'
import { useTranslation } from 'react-i18next'

export default function TutPopup() {
  const { t } = useTranslation()

  return (
    <DialogContent>
      <Grid
        container
        direction="row"
        alignItems="center"
        justify="center"
        spacing={2}
      >
        <Grid item xs={12} style={{ whiteSpace: 'pre-line' }}>
          <Typography variant="subtitle1" align="center" gutterBottom>
            {t('tutorialPopup')}
          </Typography>
        </Grid>
        <Grid item xs={12} style={{ textAlign: 'center' }}>
          <img src="/images/tutorial/popup.png" style={{ border: 'black 4px solid', borderRadius: 20 }} />
        </Grid>
        <Grid item xs={12} style={{ whiteSpace: 'pre-line' }}>
          <Typography variant="subtitle1" align="center" gutterBottom>
            {t('tutorialPopup2')}
          </Typography>
        </Grid>
      </Grid>
    </DialogContent>
  )
}
