import React from 'react'
import { Grid, Typography, Button } from '@material-ui/core'
import { useTranslation } from 'react-i18next'

export default function Errors() {
  const { t } = useTranslation()
  const error = window.location.href.split('/').pop()

  return (
    <Grid
      container
      direction="column"
      justifyContent="center"
      alignItems="center"
      style={{ minHeight: '95vh' }}
    >
      <Grid item>
        <Typography variant="h1" style={{ color: 'white' }} align="center">
          {error}
        </Typography>
      </Grid>
      <Grid item>
        <Typography variant="h6" style={{ color: 'white' }} align="center">
          {t(`errors_${error}`)}
        </Typography>
      </Grid>
      <Grid item style={{ paddingTop: 20 }}>
        <Button variant="outlined" color="secondary" onClick={() => window.location = window.location.origin}>
          {t('go_back')}
        </Button>
      </Grid>
    </Grid>
  )
}
