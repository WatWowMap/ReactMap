import * as React from 'react'
import Grid from '@mui/material/Unstable_Grid2'
import Divider from '@mui/material/Divider'

import { LocationMemo } from './Location'
import { HumanArea } from './area'
import { Status } from './status'

const BaseHuman = () => (
  <Grid container alignItems="center" justifyContent="flex-start" spacing={2}>
    <Status />
    <LocationMemo />
    <Divider
      flexItem
      light
      sx={{ height: 5, width: '100%', margin: '15px 0px' }}
    />
    <HumanArea />
  </Grid>
)

export const Human = React.memo(BaseHuman, () => true)
