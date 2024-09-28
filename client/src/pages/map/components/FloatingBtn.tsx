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
import CircularProgress from '@mui/material/CircularProgress'
import { styled } from '@mui/material/styles'
import { FAB_BUTTONS } from '@services/queries/config'
import { useLocation } from '@hooks/useLocation'
import { useMemory } from '@store/useMemory'
import { useLayoutStore } from '@store/useLayoutStore'
import { useStorage } from '@store/useStorage'
import { useScanStore } from '@features/scanner'
import { setModeBtn, useWebhookStore } from '@store/useWebhookStore'
import { I } from '@components/I'

type Keys =
  | keyof ReturnType<(typeof useLayoutStore)['getState']>
  | keyof ReturnType<(typeof useScanStore)['getState']>

const StyledStack = styled(Stack)(({ theme }) => ({
  width: 50,
  zIndex: 5000,
  '& > *': {
    margin: `${theme.spacing(1)} !important`,
    position: 'sticky',
    top: 0,
    left: 5,
    zIndex: 1000,
    width: 10,
  },
  [theme.breakpoints.up('sm')]: {
    width: 65,
  },
}))

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

const handleClick = (name: Keys) => () => {
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

  const reactControls = useStorage(
    (s) => s.settings.navigationControls === 'react',
  )
  const { lc, requesting, color } = useLocation(reactControls)

  const isMobile = useMemory((s) => s.isMobile)
  const online = useMemory((s) => s.online)

  const webhookMode = useWebhookStore((s) => s.mode)

  const scanNextMode = useScanStore((s) => s.scanNextMode)
  const scanZoneMode = useScanStore((s) => s.scanZoneMode)

  const ref = React.useRef(null)

  const fabButtons: typeof DEFAULT = data?.fabButtons || DEFAULT

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
    (name: 'zoomIn' | 'zoomOut' | 'locate') => () => {
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
    [map, lc],
  )

  React.useEffect(() => {
    DomEvent.disableClickPropagation(ref.current)
  }, [])

  return (
    <StyledStack ref={ref} alignItems="flex-start" justifyContent="flex-start">
      <Fab
        color="primary"
        disabled={disabled}
        size={fabSize}
        title={t('open_menu')}
        onClick={handleClick('drawer')}
      >
        <MenuIcon fontSize={iconSize} />
      </Fab>
      {fabButtons.profileButton && (
        <Fab
          color="primary"
          disabled={disabled}
          size={fabSize}
          title={t('user_profile')}
          onClick={handleClick('userProfile')}
        >
          <Person fontSize={iconSize} />
        </Fab>
      )}
      {fabButtons.search && (
        <Fab
          color={reactControls ? 'primary' : 'secondary'}
          disabled={disabled}
          size={fabSize}
          title={t('search')}
          onClick={handleClick('search')}
        >
          <SearchIcon fontSize={iconSize} sx={{ color: 'white' }} />
        </Fab>
      )}
      {fabButtons.webhooks && (
        <Fab
          color="secondary"
          disabled={disabled}
          size={fabSize}
          title={t('alert_manager')}
          onClick={setModeBtn('open')}
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
          disabled={!!webhookMode || !!scanZoneMode || !online}
          size={fabSize}
          title={t('scan_next')}
          onClick={handleClick('scanNextMode')}
        >
          <TrackChanges fontSize={iconSize} sx={{ color: 'white' }} />
        </Fab>
      )}
      {fabButtons.scanZone && (
        <Fab
          color={scanZoneMode === 'setLocation' ? 'primary' : 'secondary'}
          disabled={!!webhookMode || !!scanNextMode || !online}
          size={fabSize}
          title={t('scan_zone')}
          onClick={handleClick('scanZoneMode')}
        >
          <BlurOn fontSize={iconSize} sx={{ color: 'white' }} />
        </Fab>
      )}
      {!!DonorIcon && (
        <Fab
          color="secondary"
          disabled={disabled}
          size={fabSize}
          title={t('donor_menu')}
          onClick={handleClick('donorPage')}
        >
          <DonorIcon fontSize={iconSize} sx={{ color: 'white' }} />
        </Fab>
      )}
      {reactControls && (
        <>
          <Fab
            color={color}
            size={fabSize}
            title={t('use_my_location')}
            onClick={handleNavBtn('locate')}
          >
            {requesting ? (
              <CircularProgress
                size={20}
                sx={{ color: 'white' }}
                thickness={5}
              />
            ) : (
              <MyLocationIcon fontSize={iconSize} sx={{ color: 'white' }} />
            )}
          </Fab>
          <Fab
            color="secondary"
            size={fabSize}
            title={t('zoom_in')}
            onClick={handleNavBtn('zoomIn')}
          >
            <ZoomInIcon fontSize={iconSize} sx={{ color: 'white' }} />
          </Fab>
          <Fab
            color="secondary"
            size={fabSize}
            title={t('zoom_out')}
            onClick={handleNavBtn('zoomOut')}
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
            title={t('done')}
            onClick={setModeBtn('open')}
          >
            <CheckIcon fontSize={iconSize} sx={{ color: 'white' }} />
          </Fab>
        )}
      {(Array.isArray(fabButtons.custom) ? fabButtons.custom : []).map(
        (icon) => (
          <Fab
            key={`${icon.color}${icon.href}${icon.icon}`}
            color={icon.color || 'secondary'}
            disabled={disabled}
            href={icon.href}
            referrerPolicy="no-referrer"
            size={fabSize}
            target={icon.target || '_blank'}
          >
            <I className={icon.icon} color="white" size={iconSize} />
          </Fab>
        ),
      )}
    </StyledStack>
  )
}

export const FloatingButtonsMemo = React.memo(FloatingButtons, () => true)
