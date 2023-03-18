import React from 'react'
import {
  Divider,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemIcon,
  MenuItem,
  Select,
} from '@material-ui/core'
import TranslateIcon from '@material-ui/icons/Translate'
import MapIcon from '@material-ui/icons/Map'
import NavIcon from '@material-ui/icons/Navigation'
import StyleIcon from '@material-ui/icons/Style'
import DevicesOtherIcon from '@material-ui/icons/DevicesOther'

import { useTranslation } from 'react-i18next'

import { useStore, useStatic } from '@hooks/useStore'
import Utility from '@services/Utility'
import DrawerActions from './Actions'

function FCSelect({ name, label, value, handleChange, children, icon, color }) {
  return (
    <ListItem dense>
      {icon && <ListItemIcon>{icon}</ListItemIcon>}
      <FormControl
        size="small"
        color={color || 'primary'}
        fullWidth
        style={{ margin: '3px 0' }}
      >
        <InputLabel>{label}</InputLabel>
        <Select
          autoFocus
          name={name}
          value={value}
          onChange={handleChange}
          fullWidth
        >
          {children}
        </Select>
      </FormControl>
    </ListItem>
  )
}

const ICON_MAP = {
  localeSelection: TranslateIcon,
  navigation: NavIcon,
  navigationControls: StyleIcon,
  tileServers: MapIcon,
}

export default function Settings() {
  const { t, i18n } = useTranslation()
  const { config, setIcons: setStaticIcons } = useStatic.getState()
  const { setIcons, setSettings } = useStore.getState()

  const Icons = useStatic((s) => s.Icons)
  const staticSettings = useStatic((s) => s.settings)

  const settings = useStore((s) => s.settings)
  const icons = useStore((s) => s.icons)

  return (
    <List dense style={{ width: '100%' }}>
      {Object.keys(staticSettings).map((setting) => {
        const Icon = ICON_MAP[setting] || DevicesOtherIcon
        return (
          <FCSelect
            key={setting}
            name={setting}
            value={config[setting][settings[setting]]?.name || ''}
            label={t(Utility.camelToSnake(setting))}
            onChange={({ target }) => {
              setSettings({
                ...settings,
                [target.name]: config[target.name][target.value].name,
              })
              if (target.name === 'localeSelection') {
                i18n.changeLanguage(target.value)
              }
            }}
            icon={<Icon style={{ color: 'white' }} />}
          >
            {Object.keys(config[setting]).map((option) => (
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
      <Divider style={{ margin: '10px 0' }} />
      {Icons.customizable.map((category) => (
        <FCSelect
          key={category}
          name={category}
          color="secondary"
          value={icons[category]}
          label={t(`${category}_icons`, `${category} Icons`)}
          handleChange={({ target }) => {
            Icons.setSelection(target.name, target.value)
            setStaticIcons(Icons)
            setIcons({ ...icons, [target.name]: target.value })
          }}
          icon={<img src={Icons.getMisc(category)} alt={category} width={24} />}
        >
          {Icons[category].map((option) => (
            <MenuItem key={option} value={option}>
              {t(
                `${category.toLowerCase()}_${option.toLowerCase()}`,
                Utility.getProperName(option),
              )}
            </MenuItem>
          ))}
        </FCSelect>
      ))}
      {!config.map?.separateDrawerActions && (
        <>
          <Divider style={{ margin: '10px 0' }} />
          <DrawerActions />
        </>
      )}
    </List>
  )
}
