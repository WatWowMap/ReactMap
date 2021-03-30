import React from 'react'
import { Grid, Fab } from '@material-ui/core'
import {
  Menu, LocationOn, ZoomIn, ZoomOut,
} from '@material-ui/icons'

import useStyles from '../../assets/mui/styling'

export default function FloatingButtons({ map, toggleDrawer }) {
  const classes = useStyles()

  return (
    <Grid container direction="column" spacing={1} className={classes.floatingBtn}>
      <Grid item>
        <Fab color="primary" aria-label="add">
          <Menu onClick={toggleDrawer(true)} />
        </Fab>
      </Grid>
      <Grid item>
        <Fab color="secondary" aria-label="edit">
          <LocationOn onClick={() => map.locate({ watch: true, setView: true, enableHighAccuracy: true })} />
        </Fab>
      </Grid>
      <Grid item>
        <Fab color="secondary" aria-label="edit">
          <ZoomIn onClick={() => map.zoomIn()} />
        </Fab>
      </Grid>
      <Grid item>
        <Fab color="secondary" aria-label="edit">
          <ZoomOut onClick={() => map.zoomOut()} />
        </Fab>
      </Grid>
    </Grid>
  )
}
