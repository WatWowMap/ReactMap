import React from 'react'
import {
  Grid, Fab, Dialog, Button, Typography, Divider,
} from '@material-ui/core'
import {
  Menu, LocationOn, ZoomIn, ZoomOut, BugReport, Create,
} from '@material-ui/icons'
import DialogActions from '@material-ui/core/DialogActions'
import DialogContent from '@material-ui/core/DialogContent'
import DialogTitle from '@material-ui/core/DialogTitle'

import { useMap } from 'react-leaflet'
import { useMasterfile } from '../../hooks/useStore'
import useStyles from '../../hooks/useStyles'

export default function FloatingButtons({ toggleDrawer }) {
  const classes = useStyles()
  const { map: { feedbackLink, enableFeedback } } = useMasterfile(state => state.config)
  const [open, setOpen] = React.useState(false)

  const handleClickOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

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
      {enableFeedback && (
        <Grid item>
          <Fab onClick={handleClickOpen}>
            <BugReport />
          </Fab>
        </Grid>
      )}
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
            <em>This feedback is sent directly to the developers, which may not include this map&apos;s Admin.</em>
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
