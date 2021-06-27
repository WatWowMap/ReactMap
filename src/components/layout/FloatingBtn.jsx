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
  const [color, setColor] = React.useState('action')

  const handleClickOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  const map = useMap()
  const [lc] = React.useState(() => {
    const LocateFab = Locate.extend({
      /* eslint-disable react/no-this-in-sfc */
      _setClasses(state) {
        if (state === 'requesting') setColor('inherit')
        else if (state === 'active') setColor('inherit')
        else if (state === 'following') setColor('primary')
      },
      _cleanClasses() {
        setColor('action')
      },
      /* eslint-enable react/no-this-in-sfc */
    })
    const result = new LocateFab({
      keepCurrentZoomLevel: true,
      setView: 'untilPan',
    })
    result.addTo(map)
    return result
  })

  const fabSize = isMobile ? 'small' : 'large'
  const iconSize = isMobile ? 'small' : 'default'

  return (
    <Grid container direction="column" className={classes.floatingBtn}>
      <Grid item>
        <Fab color="primary" size={fabSize} onClick={toggleDrawer(true)} title={t('openMenu')}>
          <Menu fontSize={iconSize} />
        </Fab>
      </Grid>
      <Grid item>
        <Fab color="secondary" size={fabSize} onClick={() => lc._onClick()} title={t('useMyLocation')}>
          <LocationOn color={color} fontSize={iconSize} />
        </Fab>
      </Grid>
      <Grid item>
        <Fab color="secondary" size={fabSize} onClick={() => map.zoomIn()} title={t('zoomIn')}>
          <ZoomIn fontSize={iconSize} />
        </Fab>
      </Grid>
      <Grid item>
        <Fab color="secondary" size={fabSize} onClick={() => map.zoomOut()} title={t('zoomOut')}>
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
