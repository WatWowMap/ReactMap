import React from 'react'
import {
  Grid, Fab, Dialog, Button, Typography, Divider, DialogActions, DialogContent, DialogTitle, useMediaQuery,
} from '@material-ui/core'
import {
  Menu, LocationOn, ZoomIn, ZoomOut, Forum, Create, Equalizer,
} from '@material-ui/icons'
import { useMap } from 'react-leaflet'
import Locate from 'leaflet.locatecontrol'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@material-ui/styles'

import { useStatic } from '@hooks/useStore'
import useStyles from '@hooks/useStyles'

export default function FloatingButtons({ toggleDrawer }) {
  const theme = useTheme()
  const { t } = useTranslation()
  const classes = useStyles()
  const {
    map: {
      enableFeedback, feedbackLink, enableStats, statsLink,
    },
  } = useStatic(state => state.config)
  const isMobile = useMediaQuery(theme.breakpoints.only('xs'))
  const [open, setOpen] = React.useState(false)

  const handleClickOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  const map = useMap()

  const locateOptions = {
    keepCurrentZoomLevel: true,
    drawCircle: false,
    strings: {
      title: t('useMyLocation'),
    },
    onActivate: () => { },
  }
  const lc = new Locate(locateOptions)
  lc.addTo(map)

  const fabSize = isMobile ? 'small' : 'large'
  const iconSize = isMobile ? 'small' : 'default'

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
      {enableStats && (
        <Grid item>
          <Fab color="secondary" size={fabSize} href={statsLink} target="_blank" rel="noreferrer">
            <Equalizer fontSize={iconSize} style={{ color: 'white' }} />
          </Fab>
        </Grid>
      )}
      {enableFeedback && (
        <Grid item>
          <Fab size={fabSize} onClick={handleClickOpen}>
            <Forum fontSize={iconSize} />
          </Fab>
        </Grid>
      )}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="xs"
      >
        <DialogTitle>{t('submitFeedbackTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" align="center">
            {t('useTheLinkBelow')}
          </Typography>
          <br />
          <Divider />
          <br />
          <Typography variant="body2" align="center">
            <em>{t('feedbackToDevs')}</em>
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
              {t('feedbackForm')}
            </Button>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary" autoFocus>
            {t('close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}
