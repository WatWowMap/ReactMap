/* eslint-disable no-console */
/* eslint-disable no-unused-vars */
import React from 'react'
import { Grid, Fab } from '@material-ui/core'
import {
  Grid, Fab, Dialog, Button, Typography, Divider, DialogActions, DialogContent, DialogTitle, useMediaQuery,
} from '@material-ui/core'
import {
  Menu, LocationOn, ZoomIn, ZoomOut, Forum, Create, Equalizer, Person, Search,
} from '@material-ui/icons'
import { useMap } from 'react-leaflet'
import Locate from 'leaflet.locatecontrol'
import { useTranslation } from 'react-i18next'

import useStyles from '@hooks/useStyles'

export default function FloatingButtons({
  toggleDrawer, setUserProfile, toggleDialog, safeSearch, isMobile,
}) {
  const { t } = useTranslation()
  const classes = useStyles()
  const {
    map: {
      enableAccuracyCircle, locationBtnPosition,
    },
  } = useStatic(state => state.config)
  const { loggedIn } = useStatic(state => state.auth)
  const map = useMap()

  const locateOptions = {
    keepCurrentZoomLevel: true,
    setView: 'untilPan',
    circleStyle: { fillOpacity: 0.05 },
    drawCircle: enableAccuracyCircle,
  }
  const lc = new Locate(locateOptions)
  lc.addTo(map)

  const fabSize = isMobile ? 'small' : 'large'
  const iconSize = isMobile ? 'small' : 'default'

  return (
    <Grid
      container
      direction="column"
      justify={locationBtnPosition === 'bottomRight' ? 'space-between' : 'flex-start'}
      style={{ height: '100%' }}
    >
      <Grid
        container
        direction="column"
        className={classes.floatingBtn}
      >
        <Grid item>
          <Fab color="primary" size={fabSize} onClick={toggleDrawer(true)} title={t('openMenu')}>
            <Menu fontSize={iconSize} />
          </Fab>
        </Grid>
        {loggedIn && (
          <Grid item>
            <Fab color="primary" size={fabSize} onClick={() => setUserProfile(true)}>
              <Person fontSize={iconSize} />
            </Fab>
          </Grid>
        )}
        {safeSearch.length > 0 && (
          <Grid item>
            <Fab color="primary" size={fabSize} onClick={toggleDialog(true, '', 'search')} title={t('openMenu')}>
              <Search fontSize={iconSize} />
            </Fab>
          </Grid>
        )}
      </Grid>
      <Grid
        container
        direction="column"
        className={classes.floatingBtn}
        alignItems={locationBtnPosition === 'bottomRight' ? 'flex-end' : 'flex-start'}
        style={locationBtnPosition === 'bottomRight' ? { marginBottom: 15 } : {}}
      >
        <Grid
          item
          style={{ width: 'fit-content' }}
        >
          <Fab color="secondary" size={fabSize} onClick={() => lc.start()} title={t('useMyLocation')}>
            <LocationOn fontSize={iconSize} />
          </Fab>
        </Grid>
        <Grid
          item
          style={{ width: 'fit-content' }}
        >
          <Fab color="secondary" size={fabSize} onClick={() => map.zoomIn()} title={t('zoomIn')}>
            <ZoomIn fontSize={iconSize} />
          </Fab>
        </Grid>
        <Grid
          item
          style={{ width: 'fit-content' }}
        >
          <Fab color="secondary" size={fabSize} onClick={() => map.zoomOut()} title={t('zoomOut')}>
            <ZoomOut fontSize={iconSize} />
          </Fab>
        </Grid>
      </Grid>
    </Grid>
  )
}
