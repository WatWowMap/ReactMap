// @ts-check
import * as React from 'react'
import MenuIcon from '@mui/icons-material/Menu'
import MyLocationIcon from '@mui/icons-material/MyLocation'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import SearchIcon from '@mui/icons-material/Search'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import CardMembershipIcon from '@mui/icons-material/CardMembership'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import CheckIcon from '@mui/icons-material/Check'
import CurrencyBitcoinIcon from '@mui/icons-material/CurrencyBitcoin'
import CurrencyPoundIcon from '@mui/icons-material/CurrencyPound'
import Stack from '@mui/material/Stack'
import EuroSymbol from '@mui/icons-material/EuroSymbol'
import Person from '@mui/icons-material/Person'
import TrackChanges from '@mui/icons-material/TrackChanges'
import BlurOn from '@mui/icons-material/BlurOn'
import Fab from '@mui/material/Fab'
import { useQuery } from '@apollo/client'
import { useTranslation } from 'react-i18next'
import { useMap } from 'react-leaflet'
import { DomEvent } from 'leaflet'

import { FAB_BUTTONS } from '@services/queries/config'
import { useLocation } from '@hooks/useLocation'
import { useMemory } from '@store/useMemory'
import { useLayoutStore } from '@store/useLayoutStore'
import { useStorage } from '@store/useStorage'
import { useScanStore } from '@features/scanner'
import { setModeBtn, useWebhookStore } from '@store/useWebhookStore'
import { I } from '@components/I'

/** @typedef {keyof ReturnType<typeof useLayoutStore['getState']> | keyof ReturnType<typeof useScanStore['getState']>} Keys */

const DonationIcons = {
  dollar: AttachMoneyIcon,
  euro: EuroSymbol,
  card: CardMembershipIcon,
  bitcoin: CurrencyBitcoinIcon,
  pound: CurrencyPoundIcon,
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

/** @param {Keys} name */
const handleClick = (name) => () => {
  switch (name) {
    case 'scanZoneMode':
    case 'scanNextMode':
      return useScanStore.setState((prev) => ({
        [name]: prev[name] === 'setLocation' ? '' : 'setLocation',
      }))
    default:
      return useLayoutStore.setState({ [name]: true })
  }
}

export function FloatingButtons() {
  const { t } = useTranslation()
  const { data } = useQuery(FAB_BUTTONS, {
    fetchPolicy: 'cache-first',
  })
  const map = useMap()
  const { lc, color } = useLocation()

  const reactControls = useStorage(
    (s) => s.settings.navigationControls === 'react',
  )

  const isMobile = useMemory((s) => s.isMobile)
  const online = useMemory((s) => s.online)

  const webhookMode = useWebhookStore((s) => s.mode)

  const scanNextMode = useScanStore((s) => s.scanNextMode)
  const scanZoneMode = useScanStore((s) => s.scanZoneMode)

  const ref = React.useRef(null)

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
  const disabled = !!webhookMode || !!scanNextMode || !!scanZoneMode || !online

  const handleNavBtn = React.useCallback(
    (/** @type {'zoomIn' | 'zoomOut' | 'locate'} */ name) => () => {
      switch (name) {
        case 'zoomIn':
          return map.zoomIn()
        case 'zoomOut':
          return map.zoomOut()
        case 'locate':
          return lc._onClick()
        default:
          break
      }
    },
    [map],
  )

  React.useEffect(() => {
    DomEvent.disableClickPropagation(ref.current)
  }, [])

  return (
    <Stack ref={ref}>
      <Fab
        color="primary"
        size={fabSize}
        onClick={handleClick('drawer')}
        title={t('open_menu')}
        disabled={disabled}
      >
        <MenuIcon fontSize={iconSize} />
      </Fab>
      {fabButtons.profileButton && (
        <Fab
          color="primary"
          size={fabSize}
          onClick={handleClick('userProfile')}
          title={t('user_profile')}
          disabled={disabled}
        >
          <Person fontSize={iconSize} />
        </Fab>
      )}
      {fabButtons.search && (
        <Fab
          color={reactControls ? 'primary' : 'secondary'}
          size={fabSize}
          onClick={handleClick('search')}
          title={t('search')}
          disabled={disabled}
        >
          <SearchIcon fontSize={iconSize} sx={{ color: 'white' }} />
        </Fab>
      )}
      {fabButtons.webhooks && (
        <Fab
          color="secondary"
          size={fabSize}
          onClick={setModeBtn('open')}
          disabled={disabled}
          title={t('alert_manager')}
        >
          <NotificationsActiveIcon
            fontSize={iconSize}
            sx={{ color: 'white' }}
          />
        </Fab>
      )}
      {fabButtons.scanNext && (
        <Fab
          color={scanNextMode === 'setLocation' ? 'primary' : 'secondary'}
          size={fabSize}
          onClick={handleClick('scanNextMode')}
          title={t('scan_next')}
          disabled={!!webhookMode || !!scanZoneMode || !online}
        >
          <TrackChanges fontSize={iconSize} sx={{ color: 'white' }} />
        </Fab>
      )}
      {fabButtons.scanZone && (
        <Fab
          color={scanZoneMode === 'setLocation' ? 'primary' : 'secondary'}
          size={fabSize}
          onClick={handleClick('scanZoneMode')}
          title={t('scan_zone')}
          disabled={!!webhookMode || !!scanNextMode || !online}
        >
          <BlurOn fontSize={iconSize} sx={{ color: 'white' }} />
        </Fab>
      )}
      {!!DonorIcon && (
        <Fab
          color="secondary"
          size={fabSize}
          onClick={handleClick('donorPage')}
          title={t('donor_menu')}
          disabled={disabled}
        >
          <DonorIcon fontSize={iconSize} sx={{ color: 'white' }} />
        </Fab>
      )}
      {reactControls && (
        <>
          <Fab
            color="secondary"
            size={fabSize}
            onClick={handleNavBtn('locate')}
            title={t('use_my_location')}
          >
            <MyLocationIcon color={color} fontSize={iconSize} />
          </Fab>
          <Fab
            color="secondary"
            size={fabSize}
            onClick={handleNavBtn('zoomIn')}
            title={t('zoom_in')}
          >
            <ZoomInIcon fontSize={iconSize} sx={{ color: 'white' }} />
          </Fab>
          <Fab
            color="secondary"
            size={fabSize}
            onClick={handleNavBtn('zoomOut')}
            title={t('zoom_out')}
          >
            <ZoomOutIcon fontSize={iconSize} sx={{ color: 'white' }} />
          </Fab>
        </>
      )}
      {fabButtons.webhooks &&
        (webhookMode === 'areas' || webhookMode === 'location') && (
          <Fab
            color="primary"
            size={fabSize}
            onClick={setModeBtn('open')}
            title={t('done')}
          >
            <CheckIcon fontSize={iconSize} sx={{ color: 'white' }} />
          </Fab>
        )}
      {(Array.isArray(fabButtons.custom) ? fabButtons.custom : []).map(
        (icon) => (
          <Fab
            key={`${icon.color}${icon.href}${icon.icon}`}
            color={icon.color || 'secondary'}
            size={fabSize}
            href={icon.href}
            referrerPolicy="no-referrer"
            target={icon.target || '_blank'}
            disabled={disabled}
          >
            <I className={icon.icon} size={iconSize} />
          </Fab>
        ),
      )}
    </Stack>
  )
}

export const FloatingButtonsMemo = React.memo(FloatingButtons, () => true)
