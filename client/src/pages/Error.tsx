// @ts-check
import * as React from 'react'
import Grid from '@mui/material/Unstable_Grid2'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { useTranslation } from 'react-i18next'

import { useHideElement } from '@hooks/useHideElement'

export function ErrorPage() {
  const { t, i18n } = useTranslation()
  const error = decodeURIComponent(window.location.href.split('/').pop())
  useHideElement()

  return (
    <Grid
      container
      direction="column"
      justifyContent="center"
      alignItems="center"
      minHeight="100cqh"
    >
      <Grid>
        <Typography variant={error.length > 4 ? 'h3' : 'h1'} align="center">
          {error}
        </Typography>
      </Grid>
      <Grid>
        {i18n.exists(`errors_${error}`) && (
          <Typography variant="h6" align="center">
            {t(`errors_${error}`)}
          </Typography>
        )}
      </Grid>
      <Grid paddingTop={3}>
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
