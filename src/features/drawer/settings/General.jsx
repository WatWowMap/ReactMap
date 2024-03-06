// @ts-check
import * as React from 'react'
import MenuItem from '@mui/material/MenuItem'
import MapIcon from '@mui/icons-material/Map'
import NavIcon from '@mui/icons-material/Navigation'
import StyleIcon from '@mui/icons-material/Style'
import DevicesOtherIcon from '@mui/icons-material/DevicesOther'
import SquareFootIcon from '@mui/icons-material/SquareFoot'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { getProperName, camelToSnake } from '@utils/strings'
import { FCSelectListItem } from '@components/inputs/FCSelect'

const ICON_MAP = {
  navigation: <NavIcon />,
  navigationControls: <StyleIcon />,
  tileServers: <MapIcon />,
  distanceUnit: <SquareFootIcon />,
}
const FALLBACK = <DevicesOtherIcon />

export function GeneralSetting({ setting }) {
  const { t } = useTranslation()
  const staticSettings = useMemory((s) => s.settings)
  const value = useStorage((s) => s.settings[setting])
  return (
    <FCSelectListItem
      key={setting}
      name={setting}
      value={staticSettings[setting][value]?.name || ''}
      label={t(camelToSnake(setting))}
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
            `${camelToSnake(setting)}_${option.toLowerCase()}`,
            t(option.toLowerCase(), getProperName(option)),
          )}
        </MenuItem>
      ))}
    </FCSelectListItem>
  )
}
