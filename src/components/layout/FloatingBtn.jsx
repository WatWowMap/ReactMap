import React from 'react'
import {
  Grid, Fab, Dialog, Button, Typography, Divider, DialogActions, DialogContent, DialogTitle,
} from '@material-ui/core'
import {
  Menu, LocationOn, ZoomIn, ZoomOut, Forum, Create,
} from '@material-ui/icons'
import { useMap } from 'react-leaflet'
import Locate from 'leaflet.locatecontrol'

import { useMasterfile } from '../../hooks/useStore'
import useStyles from '../../hooks/useStyles'

export default function FloatingButtons({ toggleDrawer }) {
  const classes = useStyles()
  const { map: { feedbackLink, enableFeedback } } = useMasterfile(state => state.config)
  const breakpoint = useMasterfile(state => state.breakpoint)
  const [open, setOpen] = React.useState(false)

  const handleClickOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  const map = useMap()

  const locateOptions = {
    maxZoom: 19,
    strings: {
      title: 'Use My Location',
    },
    onActivate: () => { },
  }
  const lc = new Locate(locateOptions)
  lc.addTo(map)

  const fabSize = breakpoint === 'xs' ? 'small' : 'large'
  const iconSize = breakpoint === 'xs' ? 'small' : 'default'

  return (
    <Grid container direction="column" className={classes.floatingBtn}>
      <Grid item>
        <Fab color="primary" size={fabSize} onClick={toggleDrawer(true)}>
          <Menu fontSize={iconSize} />
        </Fab>
      </Grid>
      <Grid item>
        <Fab color="secondary" size={fabSize} onClick={() => lc.start()}>
          <LocationOn fontSize={iconSize} />
        </Fab>
      </Grid>
      <Grid item>
        <Fab color="secondary" size={fabSize} onClick={() => map.zoomIn()}>
          <ZoomIn fontSize={iconSize} />
        </Fab>
      </Grid>
      <Grid item>
        <Fab color="secondary" size={fabSize} onClick={() => map.zoomOut()}>
          <ZoomOut fontSize={iconSize} />
        </Fab>
      </Grid>
      {enableFeedback && (
        <Grid item>
          <Fab size={fabSize} onClick={handleClickOpen}>
            <Forum fontSize={iconSize} />
          </Fab>
        </Grid>
      )}
      {/* <LocateControl activate={activate} /> */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="xs"
      >
        <DialogTitle>Submit Feedback/Bug Report</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" align="center">
            You can use the link below to submit feedback or any bugs that you have come across.
          </Typography>
          <br />
          <Divider />
          <br />
          <Typography variant="body2" align="center">
            <em>This feedback is sent directly to the developers.</em>
          </Typography>
          <br />
          <Typography align="center">
            <Button
              variant="contained"
              color="secondary"
              startIcon={<Create />}
              href={feedbackLink}
              target="_blank"
              rel="noreferrer"
              style={{ justifyContent: 'center' }}
            >
              Feedback Form
            </Button>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary" autoFocus>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}
