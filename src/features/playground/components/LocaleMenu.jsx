// @ts-check
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

  /**
   *
   * @param {string} [value]
   */
  const handleClose = (value) => () => {
    if (value) i18n.changeLanguage(value)
    setAnchorEl(null)
  }

  return (
    <>
      <Button
        color="inherit"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        startIcon={startIcon}
      >
        {t('locale')}
      </Button>
      <Menu
        transitionDuration={200}
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={handleClose()}
      >
        {CONFIG.client.locales.map((c) => (
          <MenuItem
            key={c}
            value={c}
            onClick={handleClose(c)}
            selected={c === i18n.language}
          >
            {t(`locale_selection_${c}`)}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
