// @ts-check
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Unstable_Grid2'

import { setModeBtn } from '@store/useWebhookStore'

import { AreaGroup } from './AreaGroup'
import { Selected } from './Selected'

const Areas = () => {
  const { t } = useTranslation()

  return (
    <Grid container xs={12} justifyContent="center" alignItems="center">
      <Grid xs={6} sm={3}>
        <Typography variant="h6" pl={1}>
          {t('areas')}
        </Typography>
      </Grid>
      <Grid xs={6} display={{ xs: 'none', sm: 'block' }}>
        <Selected />
      </Grid>
      {/* <Grid xs={6} sm={3} textAlign="center">
        <AreaAction color="primary" action="none">
          {t('disable_all')}
        </AreaAction>
      </Grid>
      <Grid xs={6} sm={3} textAlign="center">
        <AreaAction color="secondary" action="all">
          {t('enable_all')}
        </AreaAction>
      </Grid> */}
      <Grid xs={6} sm={3} textAlign="center">
        <Button
          size="small"
          variant="contained"
          color="primary"
          onClick={setModeBtn('areas')}
        >
          {t('choose_on_map')}
        </Button>
      </Grid>
      <Grid xs={12} display={{ xs: 'block', sm: 'none' }} pt={2}>
        <Selected />
      </Grid>
      <AreaGroup />
    </Grid>
  )
}

export const HumanArea = React.memo(Areas, () => true)
