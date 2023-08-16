import * as React from 'react'
import Grid from '@mui/material/Unstable_Grid2'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import { useTranslation } from 'react-i18next'

import { ProfileSelect } from './ProfileSelect'
import { EnableSwitch } from './EnableSwitch'
import { HookSelection } from './HookSelection'
import { useWebhookStore } from '../../store'

export default function Status() {
  const { t } = useTranslation()
  const multipleHooks = useWebhookStore((s) => s.multipleHooks)

  return (
    <Grid container xs={12} justifyContent="flex-start" alignItems="center">
      <Grid xs={6} sm={multipleHooks ? 2 : 3}>
        <Typography variant="h6">{t('select_profile')}</Typography>
      </Grid>
      <Grid xs={6} sm={multipleHooks ? 2 : 3} textAlign="center">
        <ProfileSelect />
      </Grid>
      <HookSelection />
      <Grid xs={6} sm={multipleHooks ? 2 : 3}>
        <Typography variant="h6">{t('enabled')}</Typography>
      </Grid>
      <Grid xs={6} sm={multipleHooks ? 2 : 3} textAlign="center">
        <EnableSwitch />
      </Grid>
      <Divider
        light
        flexItem
        sx={{ height: 5, width: '100%', margin: '15px 0px' }}
      />
    </Grid>
  )
}
