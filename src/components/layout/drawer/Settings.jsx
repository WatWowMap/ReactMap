// @ts-check
import * as React from 'react'
import {
  Divider,
  FormControl,
  InputLabel,
  ListItem,
  ListItemIcon,
  MenuItem,
  Select,
} from '@mui/material'
import TranslateIcon from '@mui/icons-material/Translate'
import MapIcon from '@mui/icons-material/Map'
import NavIcon from '@mui/icons-material/Navigation'
import StyleIcon from '@mui/icons-material/Style'
import DevicesOtherIcon from '@mui/icons-material/DevicesOther'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import CakeIcon from '@mui/icons-material/Cake'
import InsightsIcon from '@mui/icons-material/Insights'

import { useTranslation } from 'react-i18next'

import { useStore, useStatic } from '@hooks/useStore'
import Utility from '@services/Utility'
import DrawerActions from './Actions'
import BoolToggle from './BoolToggle'
import LocaleSelection from '../general/LocaleSelection'

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

const ICON_MAP = {
  navigation: NavIcon,
  navigationControls: StyleIcon,
  tileServers: MapIcon,
}

export default function Settings() {
  const { t } = useTranslation()

  const Icons = useStatic((s) => s.Icons)
  const staticSettings = useStatic((s) => s.settings)
  const separateDrawerActions = useStatic(
    (s) => s.config.general.separateDrawerActions,
  )
  const holidayEffects = useStatic((s) => s.config.holidayEffects) || []

  const settings = useStore((s) => s.settings)
  const icons = useStore((s) => s.icons)
  const darkMode = useStore((s) => s.darkMode)

  return (
    <>
      {Object.keys(staticSettings).map((setting) => {
        const Icon = ICON_MAP[setting] || DevicesOtherIcon
        return (
          <FCSelect
            key={setting}
            name={setting}
            value={staticSettings[setting][settings[setting]]?.name || ''}
            label={t(Utility.camelToSnake(setting))}
            onChange={({ target }) => {
              useStore.setState((prev) => ({
                settings: {
                  ...prev.settings,
                  [target.name]: staticSettings[target.name][target.value].name,
                },
              }))
            }}
            icon={<Icon />}
          >
            {Object.keys(staticSettings[setting]).map((option) => (
              <MenuItem key={option} value={option}>
                {t(
                  `${Utility.camelToSnake(setting)}_${option.toLowerCase()}`,
                  Utility.getProperName(option),
                )}
              </MenuItem>
            ))}
          </FCSelect>
        )
      })}
      <ListItem dense>
        <ListItemIcon>
          <TranslateIcon />
        </ListItemIcon>
        <LocaleSelection />
      </ListItem>
      <Divider style={{ margin: '10px 0' }} />
      {Icons.customizable.map((category) => (
        <FCSelect
          key={category}
          name={category}
          value={icons[category]}
          label={t(`${category}_icons`, `${category} Icons`)}
          onChange={({ target }) => {
            Icons.setSelection(target.name, target.value)
            useStatic.setState({ Icons })
            useStore.setState({
              icons: { ...icons, [target.name]: target.value },
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
          {[...Icons[category]].map((option) => (
            <MenuItem key={option} value={option}>
              {t(
                `${category.toLowerCase()}_${option.toLowerCase()}`,
                Utility.getProperName(option),
              )}
            </MenuItem>
          ))}
        </FCSelect>
      ))}
      <Divider style={{ margin: '10px 0' }} />
      <BoolToggle field="darkMode" label="dark_mode">
        <ListItemIcon>
          <Brightness7Icon />
        </ListItemIcon>
      </BoolToggle>
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
      {process.env.NODE_ENV === 'development' && (
        <BoolToggle field="profiling" label={t('profiling')}>
          <ListItemIcon>
            <InsightsIcon />
          </ListItemIcon>
        </BoolToggle>
      )}
      {!separateDrawerActions && (
        <>
          <Divider style={{ margin: '10px 0' }} />
          <DrawerActions />
        </>
      )}
    </>
  )
}
