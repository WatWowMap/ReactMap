import React from 'react'
import { makeStyles } from '@material-ui/core/styles'
import { Grid, Fab } from '@material-ui/core'
import { Menu, LocationOn, ZoomIn, ZoomOut } from '@material-ui/icons'

const useStyles = makeStyles(theme => ({
  root: {
    '& > *': {
      margin: theme.spacing(1),
      position: 'sticky',
      top: 0,
      left: 5,
      zIndex: 9998
    },
  }
}))

const ActionButtons = ({ zoom, setZoom, toggleDrawer }) => {
  const classes = useStyles()

  const onClickZoom = value => {
    setZoom(zoom + value)
  }

  return (
    <Grid container direction='column' spacing={1} className={classes.root}>
      <Grid item >
        <Fab color="primary" aria-label="add">
          <Menu onClick={toggleDrawer(true)} />
        </Fab>
      </Grid>
      <Grid item >
        <Fab color="secondary" aria-label="edit">
          <LocationOn />
        </Fab>
      </Grid>
      <Grid item >
        <Fab color="secondary" aria-label="edit">
          <ZoomIn onClick={() => onClickZoom(1)} />
        </Fab>
      </Grid>
      <Grid item >
        <Fab color="secondary" aria-label="edit">
          <ZoomOut onClick={() => onClickZoom(-1)} />
        </Fab>
      </Grid>
    </Grid>
  )
}

export default ActionButtons