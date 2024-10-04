import * as React from 'react'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import TranslateIcon from '@mui/icons-material/Translate'
import { useTranslation } from 'react-i18next'

const startIcon = <TranslateIcon />

export function LocaleMenu() {
  const { t, i18n } = useTranslation()

  const [anchorEl, setAnchorEl] = React.useState(null)

  const handleClose = (value?: string) => () => {
    if (value) i18n.changeLanguage(value)
    setAnchorEl(null)
  }

  return (
    <>
      <Button
        color="inherit"
        startIcon={startIcon}
        onClick={(e) => setAnchorEl(e.currentTarget)}
      >
        {t('locale')}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        transitionDuration={200}
        onClose={handleClose()}
      >
        {CONFIG.client.locales.map((c) => (
          <MenuItem
            key={c}
            dense
            selected={c === i18n.language}
            value={c}
            onClick={handleClose(c)}
          >
            {t(`locale_selection_${c}`)}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
