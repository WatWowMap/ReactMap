// @ts-check
import * as React from 'react'
import { Link } from 'react-router-dom'
import Button from '@mui/material/Button'
import MenuIcon from '@mui/icons-material/Menu'
import ClearIcon from '@mui/icons-material/Clear'
import Divider from '@mui/material/Divider'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import { useTranslation } from 'react-i18next'

import { ToggleEditor } from './ToggleEditor'
import { Download } from './Download'
import { ThemeMenuItem } from './Theme'
import { Save } from './Save'
import { closeMenu, openMenu, usePlayStore } from '../hooks/store'

const startIcon = <MenuIcon />

export function MainMenu() {
  const { t } = useTranslation()
  const anchorEl = usePlayStore((s) => s.menuAnchorEl)

  return (
    <>
      <Button color="inherit" startIcon={startIcon} onClick={openMenu}>
        {t('menu')}
      </Button>
      <Menu open={!!anchorEl} anchorEl={anchorEl} onClose={closeMenu}>
        <ToggleEditor />
        <ThemeMenuItem />
        <Divider />
        <Download />
        <Save />
        <MenuItem component={Link} to="/" dense>
          <ListItemIcon>
            <ClearIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('exit')}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}
