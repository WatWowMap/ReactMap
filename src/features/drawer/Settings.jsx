// @ts-check
import * as React from 'react'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import ListSubheader from '@mui/material/ListSubheader'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import ListItemButton from '@mui/material/ListItemButton'
import TranslateIcon from '@mui/icons-material/Translate'
import MapIcon from '@mui/icons-material/Map'
import NavIcon from '@mui/icons-material/Navigation'
import StyleIcon from '@mui/icons-material/Style'
import DevicesOtherIcon from '@mui/icons-material/DevicesOther'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import CakeIcon from '@mui/icons-material/Cake'
import InsightsIcon from '@mui/icons-material/Insights'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff'
import LogoDevIcon from '@mui/icons-material/LogoDev'
import SquareFootIcon from '@mui/icons-material/SquareFoot'

import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'
import { toggleDialog } from '@store/useLayoutStore'
import { useStorage } from '@store/useStorage'
import { Utility } from '@services/Utility'
import {
  HAS_API,
  getPermission,
  requestPermission,
} from '@services/desktopNotification'
import { LocaleSelection } from '@components/inputs/LocaleSelection'
import { DividerWithMargin } from '@components/StyledDivider'
import { BoolToggle } from '@components/inputs/BoolToggle'

import { DrawerActions } from './Actions'

function FCSelect({ name, label, value, onChange, children, icon }) {
  return (
    <ListItem dense>
      {icon && <ListItemIcon>{icon}</ListItemIcon>}
      <FormControl size="small" fullWidth style={{ margin: '3px 0' }}>
        <InputLabel>{label}</InputLabel>
        <Select
          autoFocus
          name={name}
          value={value || ''}
          onChange={onChange}
          fullWidth
          label={label}
        >
          {children}
        </Select>
      </FormControl>
    </ListItem>
  )
}

/**
 *
 * @param {{ asset: 'icons' | 'audio' }} param0
 * @returns
 */
function UniAssetSelect({ asset }) {
  const instanceName = asset === 'icons' ? 'Icons' : 'Audio'
  const { t } = useTranslation()
  const userSettings = useStorage((s) => s[asset])
  const Asset = useMemory((s) => s[instanceName])
  const darkMode = useStorage((s) => s.darkMode)
  const Icons = useMemory((s) => s.Icons)

  if (Asset.customizable.length === 0) return null
  return (
    <>
      <ListSubheader>{t(asset)}</ListSubheader>
      {Asset.customizable.map((category) => (
        <FCSelect
          key={category}
          name={category}
          value={userSettings[category]}
          label={t(`${category}_${asset}`, `${category} ${instanceName}`)}
          onChange={({ target }) => {
            Asset.setSelection(target.name, target.value)
            useMemory.setState({ [instanceName]: Asset })
            useStorage.setState({
              [asset]: { ...userSettings, [target.name]: target.value },
            })
          }}
          icon={
            <img
              src={Icons.getMisc(category)}
              alt={category}
              width={24}
              className={darkMode ? '' : 'darken-image'}
            />
          }
        >
          {[...Asset[category]].map((option) => (
            <MenuItem key={option} value={option}>
              {t(
                `${category.toLowerCase()}_${option.toLowerCase()}`,
                Utility.getProperName(option),
              )}
            </MenuItem>
          ))}
        </FCSelect>
      ))}
      <DividerWithMargin />
    </>
  )
}

const ICON_MAP = {
  navigation: <NavIcon />,
  navigationControls: <StyleIcon />,
  tileServers: <MapIcon />,
  distanceUnit: <SquareFootIcon />,
}
const FALLBACK = <DevicesOtherIcon />

function GeneralSetting({ setting }) {
  const { t } = useTranslation()
  const staticSettings = useMemory((s) => s.settings)
  const value = useStorage((s) => s.settings[setting])
  return (
    <FCSelect
      key={setting}
      name={setting}
      value={staticSettings[setting][value]?.name || ''}
      label={t(Utility.camelToSnake(setting))}
      onChange={({ target }) => {
        useStorage.setState((prev) => ({
          settings: {
            ...prev.settings,
            [target.name]: staticSettings[target.name][target.value].name,
          },
        }))
      }}
      icon={ICON_MAP[setting] || FALLBACK}
    >
      {Object.keys(staticSettings[setting]).map((option) => (
        <MenuItem key={option} value={option}>
          {t(
            `${Utility.camelToSnake(setting)}_${option.toLowerCase()}`,
            t(option.toLowerCase(), Utility.getProperName(option)),
          )}
        </MenuItem>
      ))}
    </FCSelect>
  )
}

export function Settings() {
  const { t } = useTranslation()

  const separateDrawerActions = useMemory(
    (s) => s.config.general.separateDrawerActions,
  )
  const holidayEffects = useMemory((s) => s.config.holidayEffects) || []
  const staticSettings = useMemory((s) => s.settings)

  const darkMode = useStorage((s) => s.darkMode)

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
        <ListItemButton
          disabled={!HAS_API}
          onClick={async (event) => {
            await requestPermission()
            toggleDialog(true, 'notifications', 'options')(event)
          }}
        >
          <ListItemIcon>
            {getPermission() === 'granted' ? (
              <NotificationsActiveIcon />
            ) : (
              <NotificationsOffIcon color="error" />
            )}
          </ListItemIcon>
          <ListItemText primary={t('desktop_notifications')} />
        </ListItemButton>
      )}
      {holidayEffects.map(({ name, images }) => (
        <BoolToggle
          key={name}
          field={`holidayEffects.${name}`}
          label={t('disable', { name })}
        >
          <ListItemIcon>
            {images?.length > 0 ? (
              <img
                src={images[0]}
                alt={name}
                width={24}
                className={darkMode ? '' : 'darken-image'}
              />
            ) : (
              <CakeIcon />
            )}
          </ListItemIcon>
        </BoolToggle>
      ))}
      <DividerWithMargin />
      <UniAssetSelect asset="icons" />
      <UniAssetSelect asset="audio" />
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
