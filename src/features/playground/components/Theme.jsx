// @ts-check
import * as React from 'react'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import { useTranslation } from 'react-i18next'

import { useStorage } from '@hooks/useStorage'

export function ThemeMenuItem() {
  const { t } = useTranslation()
  const darkMode = useStorage((s) => s.darkMode)

  return (
    <MenuItem
      dense
      onClick={() =>
        useStorage.setState((prev) => ({
          darkMode: !prev.darkMode,
        }))
      }
    >
      <ListItemIcon>
        {darkMode ? (
          <LightModeIcon fontSize="small" />
        ) : (
          <DarkModeIcon fontSize="small" />
        )}
      </ListItemIcon>
      <ListItemText>{t('theme')}</ListItemText>
    </MenuItem>
  )
}
