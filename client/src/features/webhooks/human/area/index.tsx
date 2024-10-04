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
    <Grid container alignItems="center" justifyContent="center" xs={12}>
      <Grid sm={3} xs={6}>
        <Typography pl={1} variant="h6">
          {t('areas')}
        </Typography>
      </Grid>
      <Grid display={{ xs: 'none', sm: 'block' }} xs={6}>
        <Selected />
      </Grid>
      <Grid sm={3} textAlign="center" xs={6}>
        <Button
          color="primary"
          size="small"
          variant="contained"
          onClick={setModeBtn('areas')}
        >
          {t('choose_on_map')}
        </Button>
      </Grid>
      <Grid display={{ xs: 'block', sm: 'none' }} pt={2} xs={12}>
        <Selected />
      </Grid>
      <AreaGroup />
    </Grid>
  )
}

export const HumanArea = React.memo(Areas, () => true)
