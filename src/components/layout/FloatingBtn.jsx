import React, { useEffect, useRef, useState } from 'react'
import { Grid, Fab } from '@material-ui/core'
import {
  Menu, LocationOn, ZoomIn, ZoomOut, Search,
} from '@material-ui/icons'
import { useMap } from 'react-leaflet'
import Locate from 'leaflet.locatecontrol'
import { useTranslation } from 'react-i18next'
import Leaflet from 'leaflet'

import useStyles from '@hooks/useStyles'

export default function FloatingButtons({
  toggleDrawer, toggleDialog, safeSearch, isMobile,
}) {
  const { t } = useTranslation()
  const classes = useStyles()
  const [color, setColor] = useState('inherit')
  const map = useMap()
  const [lc] = useState(() => {
    const LocateFab = Locate.extend({
      _setClasses(state) {
        if (state === 'requesting') setColor('action')
        else if (state === 'active') setColor('action')
        else if (state === 'following') setColor('primary')
      },
      _cleanClasses() {
        setColor('inherit')
      },
    })
    const result = new LocateFab({
      keepCurrentZoomLevel: true,
      setView: 'untilPan',
    })
    result.addTo(map)
    return result
  })

  const fabSize = isMobile ? 'small' : 'large'
  const iconSize = isMobile ? 'small' : 'medium'
  const ref = useRef(null)
  useEffect(() => Leaflet.DomEvent.disableClickPropagation(ref.current))

  return (
    <Grid
      container
      direction="column"
      justifyContent="flex-start"
      alignItems="flex-start"
      className={classes.floatingBtn}
      ref={ref}
      style={{ width: isMobile ? 50 : 65 }}
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
    </Grid>
  )
}
