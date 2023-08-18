import React, { useEffect, useRef } from 'react'
import Menu from '@mui/icons-material/Menu'
import MyLocation from '@mui/icons-material/MyLocation'
import ZoomIn from '@mui/icons-material/ZoomIn'
import ZoomOut from '@mui/icons-material/ZoomOut'
import Search from '@mui/icons-material/Search'
import NotificationsActive from '@mui/icons-material/NotificationsActive'
import Save from '@mui/icons-material/Save'
import CardMembership from '@mui/icons-material/CardMembership'
import AttachMoney from '@mui/icons-material/AttachMoney'
import EuroSymbol from '@mui/icons-material/EuroSymbol'
import Person from '@mui/icons-material/Person'
import TrackChanges from '@mui/icons-material/TrackChanges'
import BlurOn from '@mui/icons-material/BlurOn'
import Grid from '@mui/material/Grid'
import Fab from '@mui/material/Fab'

import { useTranslation } from 'react-i18next'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

import useLocation from '@hooks/useLocation'
import { useStore, useStatic } from '@hooks/useStore'
import { I } from './general/I'

const DonationIcons = {
  dollar: AttachMoney,
  euro: EuroSymbol,
  card: CardMembership,
}

export default function FloatingButtons({
  toggleDrawer,
  toggleDialog,
  safeSearch,
  isMobile,
  webhookMode,
  setWebhookMode,
  settings,
  webhooks,
  donationPage,
  setDonorPage,
  setUserProfile,
  scanNextMode,
  setScanNextMode,
  scanZoneMode,
  setScanZoneMode,
}) {
  const { t } = useTranslation()

  const {
    config: {
      map: { enableFloatingProfileButton, customFloatingIcons = [] },
      scanner: { scannerType, enableScanNext, enableScanZone },
    },
    auth: { loggedIn, perms },
  } = useStatic.getState()

  const map = useMap()
  const ref = useRef(null)
  const { lc, color } = useLocation(map)
  const selectedWebhook = useStore((s) => s.selectedWebhook)

  const fabSize = isMobile ? 'small' : 'large'
  const iconSize = isMobile ? 'small' : 'medium'

  useEffect(() => {
    L.DomEvent.disableClickPropagation(ref.current)
  }, [])

  const showDonorPage =
    (perms.donor ? donationPage.showToDonors : true) &&
    donationPage.showOnMap &&
    donationPage?.components?.length

  const DonorIcon = showDonorPage
    ? DonationIcons[donationPage.fabIcon || 'card']
    : null

  const disabled =
    Boolean(webhookMode) || Boolean(scanNextMode) || Boolean(scanZoneMode)
  return (
    <Grid
      container
      direction="column"
      justifyContent="flex-start"
      alignItems="flex-start"
      ref={ref}
      sx={(theme) => ({
        width: isMobile ? 50 : 65,
        zIndex: 5000,
        '& > *': {
          margin: `${theme.spacing(1)} !important`,
          position: 'sticky',
          top: 0,
          left: 5,
          zIndex: 1000,
          width: 10,
        },
      })}
    >
      <Grid item>
        <Fab
          color="primary"
          size={fabSize}
          onClick={toggleDrawer(true)}
          title={t('open_menu')}
          disabled={disabled}
        >
          <Menu fontSize={iconSize} />
        </Fab>
      </Grid>
      {enableFloatingProfileButton && loggedIn && (
        <Grid item>
          <Fab
            color="primary"
            size={fabSize}
            onClick={() => setUserProfile(true)}
            title={t('user_profile')}
            disabled={disabled}
          >
            <Person fontSize={iconSize} />
          </Fab>
        </Grid>
      )}
      {safeSearch.length ? (
        <Grid item>
          <Fab
            color={
              settings.navigationControls === 'react' ? 'primary' : 'secondary'
            }
            size={fabSize}
            onClick={toggleDialog(true, '', 'search')}
            title={t('search')}
            disabled={disabled}
          >
            <Search fontSize={iconSize} sx={{ color: 'white' }} />
          </Fab>
        </Grid>
      ) : null}
      {perms?.webhooks?.length && webhooks && selectedWebhook ? (
        <Grid item>
          <Fab
            color="secondary"
            size={fabSize}
            onClick={() => setWebhookMode('open')}
            title={selectedWebhook}
            disabled={disabled}
          >
            <NotificationsActive fontSize={iconSize} sx={{ color: 'white' }} />
          </Fab>
        </Grid>
      ) : null}
      {perms?.scanner?.includes('scanNext') && enableScanNext ? (
        <Grid item>
          <Fab
            color={scanNextMode === 'setLocation' ? null : 'secondary'}
            size={fabSize}
            onClick={() =>
              scanNextMode === 'setLocation'
                ? setScanNextMode(false)
                : setScanNextMode('setLocation')
            }
            title={t('scan_next')}
            disabled={Boolean(webhookMode) || Boolean(scanZoneMode)}
          >
            <TrackChanges fontSize={iconSize} sx={{ color: 'white' }} />
          </Fab>
        </Grid>
      ) : null}
      {perms?.scanner?.includes('scanZone') &&
      enableScanZone &&
      scannerType !== 'mad' ? (
        <Grid item>
          <Fab
            color={scanZoneMode === 'setLocation' ? null : 'secondary'}
            size={fabSize}
            onClick={() =>
              scanZoneMode === 'setLocation'
                ? setScanZoneMode(false)
                : setScanZoneMode('setLocation')
            }
            title={t('scan_zone')}
            disabled={Boolean(webhookMode) || Boolean(scanNextMode)}
          >
            <BlurOn fontSize={iconSize} sx={{ color: 'white' }} />
          </Fab>
        </Grid>
      ) : null}
      {showDonorPage ? (
        <Grid item>
          <Fab
            color="secondary"
            size={fabSize}
            onClick={() => setDonorPage(true)}
            title={t('donor_menu')}
            disabled={disabled}
          >
            <DonorIcon fontSize={iconSize} sx={{ color: 'white' }} />
          </Fab>
        </Grid>
      ) : null}
      {settings.navigationControls === 'react' ? (
        <>
          <Grid item>
            <Fab
              color="secondary"
              size={fabSize}
              onClick={() => lc._onClick()}
              title={t('use_my_location')}
            >
              <MyLocation color={color} fontSize={iconSize} />
            </Fab>
          </Grid>
          <Grid item>
            <Fab
              color="secondary"
              size={fabSize}
              onClick={() => map.zoomIn()}
              title={t('zoom_in')}
            >
              <ZoomIn fontSize={iconSize} sx={{ color: 'white' }} />
            </Fab>
          </Grid>
          <Grid item>
            <Fab
              color="secondary"
              size={fabSize}
              onClick={() => map.zoomOut()}
              title={t('zoom_out')}
            >
              <ZoomOut fontSize={iconSize} sx={{ color: 'white' }} />
            </Fab>
          </Grid>
        </>
      ) : null}
      {(webhookMode === 'areas' || webhookMode === 'location') && (
        <Grid item>
          <Fab
            color="primary"
            size={fabSize}
            onClick={() => setWebhookMode('open')}
            title={t('save')}
          >
            <Save fontSize={iconSize} sx={{ color: 'white' }} />
          </Fab>
        </Grid>
      )}
      {customFloatingIcons.map((icon) => (
        <Grid item key={`${icon.color}${icon.href}${icon.icon}`}>
          <Fab
            color={icon.color || 'secondary'}
            size={fabSize}
            href={icon.href}
            referrerPolicy="no-referrer"
            target={icon.target || '_blank'}
            disabled={disabled}
          >
            <I className={icon.icon} size={iconSize} />
          </Fab>
        </Grid>
      ))}
    </Grid>
  )
}
