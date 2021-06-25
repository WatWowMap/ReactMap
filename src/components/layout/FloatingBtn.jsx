import React from 'react'
import { Grid, Fab } from '@material-ui/core'
import {
  Menu, LocationOn, ZoomIn, ZoomOut, Search,
} from '@material-ui/icons'
import { useMap } from 'react-leaflet'
import Locate from 'leaflet.locatecontrol'
import { useTranslation } from 'react-i18next'

import useStyles from '@hooks/useStyles'

export default function FloatingButtons({
  toggleDrawer, toggleDialog, safeSearch, isMobile,
}) {
  const { t } = useTranslation()
  const classes = useStyles()
  const map = useMap()

  const locateOptions = {
    keepCurrentZoomLevel: true,
    onActivate: () => { },
  }
  const lc = new Locate(locateOptions)
  lc.addTo(map)

  const fabSize = isMobile ? 'small' : 'large'
  const iconSize = isMobile ? 'small' : 'default'

  return (
    <Grid
      container
      direction="column"
      justify="flex-start"
      alignItems="flex-start"
      className={classes.floatingBtn}
    >
      <Grid item>
        <Fab color="primary" size={fabSize} onClick={toggleDrawer(true)} title={t('openMenu')}>
          <Menu fontSize={iconSize} />
        </Fab>
      </Grid>
      {safeSearch.length > 0 && (
        <Grid item>
          <Fab color="primary" size={fabSize} onClick={toggleDialog(true, '', 'search')} title={t('openMenu')}>
            <Search fontSize={iconSize} />
          </Fab>
        </Grid>
      )}
      <Grid item>
        <Fab color="secondary" size={fabSize} onClick={() => lc.start()} title={t('useMyLocation')}>
          <LocationOn fontSize={iconSize} />
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
    </Grid>
  )
}
