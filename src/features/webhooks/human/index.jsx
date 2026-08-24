// @ts-check

import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Unstable_Grid2'
import * as React from 'react'
import { HumanArea } from './area'
import { LocationMemo } from './Location'
import { Status } from './status'

const BaseHuman = () => (
  <Grid container justifyContent="flex-start" alignItems="center" spacing={2}>
    <Status />
    <LocationMemo />
    <Divider
      light
      flexItem
      sx={{ height: 5, width: '100%', margin: '15px 0px' }}
    />
    <HumanArea />
  </Grid>
)

export const Human = React.memo(BaseHuman, () => true)
