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

export function MainMenu() {
  const { t } = useTranslation()

  const [anchorEl, setAnchorEl] = React.useState(null)

  return (
    <>
      <Button
        color="inherit"
        startIcon={<MenuIcon />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
      >
        {t('menu')}
      </Button>
      <Menu
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
      >
        <Download />
        <ToggleEditor />
        <ThemeMenuItem />
        <Divider />
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
