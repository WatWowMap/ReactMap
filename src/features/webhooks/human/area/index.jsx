// @ts-check
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Unstable_Grid2'

import { setModeBtn } from '@store/useWebhookStore'
import { AreaAction, AreaGroup } from './AreaGroup'
import { Selected } from './Selected'

const Areas = () => {
  const { t } = useTranslation()

  return (
    <Grid container xs={12} justifyContent="center" alignItems="center">
      <Grid xs={6} sm={3} pb={{ xs: 2, sm: 0 }}>
        <Typography variant="h6" pl={1}>
          {t('areas')}
        </Typography>
      </Grid>
      <Grid
        xs={6}
        sm={3}
        textAlign="center"
        display={{ xs: 'block', sm: 'none' }}
        pb={{ xs: 2, sm: 0 }}
      >
        <Button
          size="small"
          variant="contained"
          color="primary"
          onClick={setModeBtn('areas')}
        >
          {t('choose_on_map')}
        </Button>
      </Grid>
      <Grid xs={6} sm={3} textAlign="center">
        <AreaAction color="primary" action="none">
          {t('disable_all')}
        </AreaAction>
      </Grid>
      <Grid xs={6} sm={3} textAlign="center">
        <AreaAction color="secondary" action="all">
          {t('enable_all')}
        </AreaAction>
      </Grid>
      <Grid
        xs={6}
        sm={3}
        textAlign="center"
        display={{ xs: 'none', sm: 'block' }}
      >
        <Button
          size="small"
          variant="contained"
          color="primary"
          onClick={setModeBtn('areas')}
        >
          {t('choose_on_map')}
        </Button>
      </Grid>
      <AreaGroup />
      <Grid container xs={12} alignItems="center" justifyContent="center" />
      <Grid xs={12}>
        <Selected />
      </Grid>
    </Grid>
  )
}

export default React.memo(Areas, () => true)
