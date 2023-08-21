// @ts-check
import * as React from 'react'
import Grid from '@mui/material/Unstable_Grid2'
import Divider from '@mui/material/Divider'

import Location from './Location'
import Areas from './area'
import Status from './status'

const Human = () => (
  <Grid container justifyContent="flex-start" alignItems="center" spacing={2}>
    <Status />
    <Location />
    <Divider
      light
      flexItem
      sx={{ height: 5, width: '100%', margin: '15px 0px' }}
    />
    <Areas />
  </Grid>
)

export default Human
