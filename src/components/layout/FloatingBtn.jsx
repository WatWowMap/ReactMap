// @ts-check
import * as React from 'react'
import Menu from '@mui/icons-material/Menu'
import MyLocation from '@mui/icons-material/MyLocation'
import ZoomIn from '@mui/icons-material/ZoomIn'
import ZoomOut from '@mui/icons-material/ZoomOut'
import Search from '@mui/icons-material/Search'
import NotificationsActive from '@mui/icons-material/NotificationsActive'
import Save from '@mui/icons-material/Save'
import CardMembership from '@mui/icons-material/CardMembership'
import AttachMoney from '@mui/icons-material/AttachMoney'
// import CurrencyBitcoinIcon from '@mui/icons-material/CurrencyBitcoin'
// import CurrencyPoundIcon from '@mui/icons-material/CurrencyPound'
import EuroSymbol from '@mui/icons-material/EuroSymbol'
import Person from '@mui/icons-material/Person'
import TrackChanges from '@mui/icons-material/TrackChanges'
import BlurOn from '@mui/icons-material/BlurOn'
import Grid from '@mui/material/Grid'
import Fab from '@mui/material/Fab'
import { useQuery } from '@apollo/client'

import { useTranslation } from 'react-i18next'
import { useMap } from 'react-leaflet'
import * as L from 'leaflet'

import { FAB_BUTTONS } from '@services/queries/config'
import useLocation from '@hooks/useLocation'
import { useDialogStore, useStatic, useStore } from '@hooks/useStore'

import FAIcon from './general/FAIcon'

const DonationIcons = {
  dollar: AttachMoney,
  euro: EuroSymbol,
  card: CardMembership,
  // bitcoin: CurrencyBitcoinIcon,
  // pound: CurrencyPoundIcon,
}

const DEFAULT = {
  custom: [],
  donationButton: '',
  profileButton: false,
  scanNext: false,
  scanZone: false,
  webhooks: false,
  search: false,
}

export default function FloatingButtons({
  toggleDrawer,
  toggleDialog,
  webhookMode,
  setWebhookMode,
  setUserProfile,
  scanNextMode,
  setScanNextMode,
  scanZoneMode,
  setScanZoneMode,
}) {
  const { t } = useTranslation()
  const { data } = useQuery(FAB_BUTTONS, {
    fetchPolicy: 'cache-first',
  })
  const map = useMap()
  const ref = React.useRef(null)
  const { lc, color } = useLocation()
  const selectedWebhook = useStore((s) => s.selectedWebhook)
  const reactControls = useStore(
    (s) => s.settings.navigationControls === 'react',
  )
  const isMobile = useStatic((s) => s.isMobile)

  React.useEffect(() => {
    L.DomEvent.disableClickPropagation(ref.current)
  }, [])

  const fabButtons = /** @type {typeof DEFAULT} */ (data?.fabButtons || DEFAULT)

  const DonorIcon = React.useMemo(
    () =>
      fabButtons.donationButton in DonationIcons
        ? DonationIcons[fabButtons.donationButton]
        : null,
    [fabButtons.donationButton],
  )

  const fabSize = isMobile ? 'small' : 'large'
  const iconSize = isMobile ? 'small' : 'medium'
  const disabled = !!webhookMode || !!scanNextMode || !!scanZoneMode

  return (
    <Grid
      container
      direction="column"
      justifyContent="flex-start"
      alignItems="flex-start"
      ref={ref}
      sx={(theme) => ({
        width: { xs: 50, sm: 65 },
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
      {fabButtons.profileButton && (
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
      {fabButtons.search && (
        <Grid item>
          <Fab
            color={reactControls ? 'primary' : 'secondary'}
            size={fabSize}
            onClick={toggleDialog(true, '', 'search')}
            title={t('search')}
            disabled={disabled}
          >
            <Search fontSize={iconSize} sx={{ color: 'white' }} />
          </Fab>
        </Grid>
      )}
      {fabButtons.webhooks && selectedWebhook && (
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
      )}
      {fabButtons.scanNext && (
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
      )}
      {fabButtons.scanZone && (
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
      )}
      {!!DonorIcon && (
        <Grid item>
          <Fab
            color="secondary"
            size={fabSize}
            onClick={() => useDialogStore.setState({ donorPage: true })}
            title={t('donor_menu')}
            disabled={disabled}
          >
            <DonorIcon fontSize={iconSize} sx={{ color: 'white' }} />
          </Fab>
        </Grid>
      )}
      {reactControls && (
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
      )}
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
      {fabButtons.custom.map((icon) => (
        <Grid item key={`${icon.color}${icon.href}${icon.icon}`}>
          <Fab
            color={icon.color || 'secondary'}
            size={fabSize}
            href={icon.href}
            referrerPolicy="no-referrer"
            target={icon.target || '_blank'}
            disabled={disabled}
          >
            <FAIcon className={icon.icon} size={iconSize} />
          </Fab>
        </Grid>
      ))}
    </Grid>
  )
}
