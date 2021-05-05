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
        <Fab color="primary" onClick={toggleDrawer(true)}>
          <Menu />
        </Fab>
      </Grid>
      <Grid item>
        <Fab color="secondary" onClick={() => map.locate({ watch: true, setView: true, enableHighAccuracy: true })}>
          <LocationOn />
        </Fab>
      </Grid>
      <Grid item>
        <Fab color="secondary" onClick={() => map.zoomIn()}>
          <ZoomIn />
        </Fab>
      </Grid>
      <Grid item>
        <Fab color="secondary" onClick={() => map.zoomOut()}>
          <ZoomOut />
        </Fab>
      </Grid>
    </Grid>
  )
}
