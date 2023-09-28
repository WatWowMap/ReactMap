// @ts-check
import * as React from 'react'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { useTranslation } from 'react-i18next'

const rootLoading = document.getElementById('loader')

export default function Errors() {
  const { t } = useTranslation()
  const error = window.location.href.split('/').pop()

  React.useEffect(() => {
    if (rootLoading) {
      rootLoading.style.display = 'none'
    }
  }, [])

  return (
    <Grid
      container
      direction="column"
      justifyContent="center"
      alignItems="center"
      minHeight="100cqh"
    >
      <Grid item>
        <Typography variant="h1" align="center">
          {error}
        </Typography>
      </Grid>
      <Grid item>
        <Typography variant="h6" align="center">
          {t(`errors_${error}`)}
        </Typography>
      </Grid>
      <Grid item style={{ paddingTop: 20 }}>
        <Button
          variant="contained"
          color="secondary"
          onClick={() => window.history.back()}
        >
          {t('go_back')}
        </Button>
      </Grid>
    </Grid>
  )
}
