import React, { useEffect, useRef } from 'react'
import { Grid, Fab } from '@material-ui/core'
import {
  Menu, LocationOn, ZoomIn, ZoomOut, Search, NotificationsActive, Save, CardMembership,
} from '@material-ui/icons'
import { useTranslation } from 'react-i18next'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

import useStyles from '@hooks/useStyles'
import useLocation from '@hooks/useLocation'
import { useStore } from '@hooks/useStore'

export default function FloatingButtons({
  toggleDrawer, toggleDialog, safeSearch,
  isMobile, perms, webhookMode, setWebhookMode,
  settings, webhooks, donationPage, setDonorPage,
}) {
  const { t } = useTranslation()
  const map = useMap()
  const ref = useRef(null)
  const classes = useStyles()
  const { lc, color } = useLocation(map)
  const selectedWebhook = useStore(s => s.selectedWebhook)

  const fabSize = isMobile ? 'small' : 'large'
  const iconSize = isMobile ? 'small' : 'medium'

  useEffect(() => L.DomEvent.disableClickPropagation(ref.current))

  const showDonorPage = (perms.donor ? donationPage.showToDonors : true)
    && donationPage.showOnMap && donationPage.components.length

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
        <Fab color="primary" size={fabSize} onClick={toggleDrawer(true)} title={t('open_menu')} disabled={Boolean(webhookMode)}>
          <Menu fontSize={iconSize} />
        </Fab>
      </Grid>
      {safeSearch.length > 0 ? (
        <Grid item>
          <Fab color={settings.navigationControls === 'react' ? 'primary' : 'secondary'} size={fabSize} onClick={toggleDialog(true, '', 'search')} title={t('search')} disabled={Boolean(webhookMode)}>
            <Search fontSize={iconSize} />
          </Fab>
        </Grid>
      ) : null}
      {(perms?.webhooks?.length && webhooks && selectedWebhook) ? (
        <Grid item>
          <Fab color="secondary" size={fabSize} onClick={() => setWebhookMode('open')} title={selectedWebhook} disabled={Boolean(webhookMode)}>
            <NotificationsActive fontSize={iconSize} />
          </Fab>
        </Grid>
      ) : null}
      {showDonorPage ? (
        <Grid item>
          <Fab color="secondary" size={fabSize} onClick={() => setDonorPage(true)} title={t('donor_menu')} disabled={Boolean(webhookMode)}>
            <CardMembership fontSize={iconSize} />
          </Fab>
        </Grid>
      ) : null}
      {settings.navigationControls === 'react' ? (
        <>
          <Grid item>
            <Fab color="secondary" size={fabSize} onClick={() => lc._onClick()} title={t('use_my_location')}>
              <LocationOn color={color} fontSize={iconSize} />
            </Fab>
          </Grid>
          <Grid item>
            <Fab color="secondary" size={fabSize} onClick={() => map.zoomIn()} title={t('zoom_in')}>
              <ZoomIn fontSize={iconSize} />
            </Fab>
          </Grid>
          <Grid item>
            <Fab color="secondary" size={fabSize} onClick={() => map.zoomOut()} title={t('zoom_out')}>
              <ZoomOut fontSize={iconSize} />
            </Fab>
          </Grid>
        </>
      ) : null}
      {(webhookMode === 'areas' || webhookMode === 'location') && (
        <Grid item>
          <Fab color="primary" size={fabSize} onClick={() => setWebhookMode('open')} title={t('save')}>
            <Save fontSize={iconSize} />
          </Fab>
        </Grid>
      )}
    </Grid>
  )
}
