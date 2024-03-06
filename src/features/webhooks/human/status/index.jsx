import * as React from 'react'
import Grid from '@mui/material/Unstable_Grid2'
import Divider from '@mui/material/Divider'

import { useWebhookStore } from '@store/useWebhookStore'

import { ProfileSelect } from './ProfileSelect'
import { EnableSwitch } from './EnableSwitch'
import { HookSelection } from './HookSelection'

export function Status() {
  const multipleHooks = useWebhookStore((s) => s.multipleHooks)

  const sm = multipleHooks ? 4 : 6
  return (
    <Grid container xs={12} justifyContent="space-between" alignItems="center">
      <Grid xs={multipleHooks ? 12 : 6} sm={sm} textAlign="center">
        <EnableSwitch />
      </Grid>
      <Grid xs={6} sm={sm} textAlign="center">
        <ProfileSelect />
      </Grid>
      <Grid xs={6} sm={sm} textAlign="center">
        <HookSelection />
      </Grid>
      <Divider
        light
        flexItem
        sx={{ height: 5, width: '100%', margin: '15px 0px' }}
      />
    </Grid>
  )
}
