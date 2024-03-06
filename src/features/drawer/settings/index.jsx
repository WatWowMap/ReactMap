// @ts-check
import * as React from 'react'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListSubheader from '@mui/material/ListSubheader'
import TranslateIcon from '@mui/icons-material/Translate'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import InsightsIcon from '@mui/icons-material/Insights'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff'
import LogoDevIcon from '@mui/icons-material/LogoDev'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'
import { toggleDialog } from '@store/useLayoutStore'
import {
  HAS_API,
  getPermission,
  requestPermission,
} from '@services/desktopNotification'
import { LocaleSelection } from '@components/inputs/LocaleSelection'
import { DividerWithMargin } from '@components/StyledDivider'
import { BoolToggle } from '@components/inputs/BoolToggle'
import { BasicListButton } from '@components/inputs/BasicListButton'

import { DrawerActions } from '../components/Actions'
import { GeneralSetting } from './General'
import { UAssetSetting } from './UAssets'
import { HolidaySetting } from './Holiday'

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
