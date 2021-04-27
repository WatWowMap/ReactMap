import React from 'react'
import { Grid, Fab } from '@material-ui/core'
import {
  Menu, LocationOn, ZoomIn, ZoomOut,
} from '@material-ui/icons'
import { useMap } from 'react-leaflet'
import useStyles from '../../assets/mui/styling'

export default function FloatingButtons({ toggleDrawer }) {
  const classes = useStyles()
  const map = useMap()

  return (
    <Grid container direction="column" spacing={1} className={classes.floatingBtn}>
      <Grid item>
        <Fab color="primary">
          <Menu onClick={toggleDrawer(true)} />
        </Fab>
      </Grid>
      <Grid item>
        <Fab color="secondary">
          <LocationOn onClick={() => map.locate({ watch: true, setView: true, enableHighAccuracy: true })} />
        </Fab>
      </Grid>
      <Grid item>
        <Fab color="secondary">
          <ZoomIn onClick={() => map.zoomIn()} />
        </Fab>
      </Grid>
      <Grid item>
        <Fab color="secondary">
          <ZoomOut onClick={() => map.zoomOut()} />
        </Fab>
      </Grid>
    </Grid>
  )
}
