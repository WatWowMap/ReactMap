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
    <Grid container alignItems="center" justifyContent="space-between" xs={12}>
      <Grid sm={sm} textAlign="center" xs={multipleHooks ? 12 : 6}>
        <EnableSwitch />
      </Grid>
      <Grid sm={sm} textAlign="center" xs={6}>
        <ProfileSelect />
      </Grid>
      <Grid sm={sm} textAlign="center" xs={6}>
        <HookSelection />
      </Grid>
      <Divider
        flexItem
        light
        sx={{ height: 5, width: '100%', margin: '15px 0px' }}
      />
    </Grid>
  )
}
