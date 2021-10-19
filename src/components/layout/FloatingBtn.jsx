/* eslint-disable react/no-this-in-sfc */
import React, { useEffect, useRef, useState } from 'react'
import { Grid, Fab } from '@material-ui/core'
import {
  Menu, LocationOn, ZoomIn, ZoomOut, Search,
} from '@material-ui/icons'
import { useMap } from 'react-leaflet'
import Locate from 'leaflet.locatecontrol'
import { useTranslation } from 'react-i18next'
import L from 'leaflet'

import useStyles from '@hooks/useStyles'

export default function FloatingButtons({
  toggleDrawer, toggleDialog, safeSearch, isMobile, settings,
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
      onAdd() {
        const container = L.DomUtil.create('div', 'react-locate-control leaflet-bar leaflet-control')
        this._container = container
        this._map = map
        this._layer = this.options.layer || new L.LayerGroup()
        this._layer.addTo(map)
        this._event = undefined
        this._compassHeading = null
        this._prevBounds = null

        const linkAndIcon = this.options.createButtonCallback(container, this.options)
        this._link = linkAndIcon.link
        this._icon = linkAndIcon.icon

        L.DomEvent.on(
          this._link,
          'click',
          function stuff(ev) {
            L.DomEvent.stopPropagation(ev)
            L.DomEvent.preventDefault(ev)
            this._onClick()
          },
          this,
        ).on(this._link, 'dblclick', L.DomEvent.stopPropagation)

        this._resetVariables()

        this._map.on('unload', this._unload, this)

        return container
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
  useEffect(() => L.DomEvent.disableClickPropagation(ref.current))

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
          <Fab color={settings.navigationControls === 'react' ? 'primary' : 'secondary'} size={fabSize} onClick={toggleDialog(true, '', 'search')} title={t('openMenu')}>
            <Search fontSize={iconSize} />
          </Fab>
        </Grid>
      )}
      {settings.navigationControls === 'react' && (
        <>
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
        </>
      )}
    </Grid>
  )
}
