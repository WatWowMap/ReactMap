// @ts-check

import { BasicListButton } from '@components/inputs/BasicListButton'
import { BoolToggle } from '@components/inputs/BoolToggle'
import { LocaleSelection } from '@components/inputs/LocaleSelection'
import { DividerWithMargin } from '@components/StyledDivider'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import InsightsIcon from '@mui/icons-material/Insights'
import LogoDevIcon from '@mui/icons-material/LogoDev'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff'
import TranslateIcon from '@mui/icons-material/Translate'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListSubheader from '@mui/material/ListSubheader'
import {
  getPermission,
  HAS_API,
  requestPermission,
} from '@services/desktopNotification'
import { toggleDialog } from '@store/useLayoutStore'
import { useMemory } from '@store/useMemory'
import { useTranslation } from 'react-i18next'

import { DrawerActions } from '../components/Actions'
import { GeneralSetting } from './General'
import { HolidaySetting } from './Holiday'
import { UAssetSetting } from './UAssets'

export function Settings() {
  const { t } = useTranslation()

  const separateDrawerActions = useMemory(
    (s) => s.config.general.separateDrawerActions,
  )
  const staticSettings = useMemory((s) => s.settings)

  return (
    <>
      <ListSubheader>{t('general')}</ListSubheader>
      {Object.keys(staticSettings).map((setting) => (
        <GeneralSetting key={setting} setting={setting} />
      ))}
      <ListItem dense>
        <ListItemIcon>
          <TranslateIcon />
        </ListItemIcon>
        <LocaleSelection />
      </ListItem>
      <BoolToggle field="darkMode">
        <ListItemIcon>
          <Brightness7Icon />
        </ListItemIcon>
      </BoolToggle>
      <BoolToggle field="enhancedGraphics">
        <ListItemIcon>
          <AutoAwesomeIcon />
        </ListItemIcon>
      </BoolToggle>
      {HAS_API && (
        <BasicListButton
          disabled={!HAS_API}
          onClick={async () => {
            await requestPermission()
            toggleDialog(true, 'notifications', 'options')()
          }}
          label="desktop_notifications"
        >
          {getPermission() === 'granted' ? (
            <NotificationsActiveIcon />
          ) : (
            <NotificationsOffIcon color="error" />
          )}
        </BasicListButton>
      )}
      <HolidaySetting />
      <DividerWithMargin />
      <UAssetSetting asset="icons" />
      <UAssetSetting asset="audio" />
      {process.env.NODE_ENV === 'development' && (
        <>
          <ListSubheader>{t('developer')}</ListSubheader>
          <BoolToggle field="profiling">
            <ListItemIcon>
              <InsightsIcon />
            </ListItemIcon>
          </BoolToggle>
          <BoolToggle field="stateTraceLog">
            <ListItemIcon>
              <LogoDevIcon />
            </ListItemIcon>
          </BoolToggle>
          <DividerWithMargin />
        </>
      )}
      {!separateDrawerActions && (
        <>
          <DividerWithMargin />
          <DrawerActions />
        </>
      )}
    </>
  )
}
