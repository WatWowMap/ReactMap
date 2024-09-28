import { Link } from 'react-router-dom'
import Button from '@mui/material/Button'
import MenuIcon from '@mui/icons-material/Menu'
import ClearIcon from '@mui/icons-material/Clear'
import ReplayIcon from '@mui/icons-material/Replay'
import Divider from '@mui/material/Divider'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import { useTranslation } from 'react-i18next'

import { closeMenu, openMenu, usePlayStore } from '../hooks/store'

import { ToggleEditor } from './ToggleEditor'
import { Download } from './Download'
import { ThemeMenuItem } from './Theme'
import { Save } from './Save'

const startIcon = <MenuIcon />

export function MainMenu() {
  const { t } = useTranslation()
  const anchorEl = usePlayStore((s) => s.menuAnchorEl)

  return (
    <>
      <Button color="inherit" startIcon={startIcon} onClick={openMenu}>
        {t('menu')}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        transitionDuration={200}
        onClose={closeMenu}
      >
        <ToggleEditor />
        <ThemeMenuItem />
        <Divider />
        <MenuItem
          dense
          onClick={() => {
            const lastSaved = localStorage.getItem('playground')

            if (lastSaved) {
              usePlayStore.setState({ code: lastSaved })
            }
          }}
        >
          <ListItemIcon>
            <ReplayIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('load_from_autosave')}</ListItemText>
        </MenuItem>
        <Download />
        <Save />
        <MenuItem dense component={Link} to="/">
          <ListItemIcon>
            <ClearIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('exit')}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}
