// @ts-check
import * as React from 'react'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import PagesIcon from '@mui/icons-material/Pages'
import { useTranslation } from 'react-i18next'
import Utility from '@services/Utility'

import { fetchCode, setComponent, usePlayStore } from '../hooks/store'

const PAGES = ['loginPage', 'messageOfTheDay', 'donationPage']

const pagesIcon = <PagesIcon />

export function ComponentMenu() {
  const { t } = useTranslation()
  const component = usePlayStore((s) => s.component)
  const [anchorEl, setAnchorEl] = React.useState(null)

  /**
   *
   * @param {string} [newComponent]
   */
  const handleClose = (newComponent) => () => {
    setAnchorEl(null)
    if (newComponent) setComponent(newComponent)
  }

  React.useEffect(() => {
    fetchCode(component)
  }, [component])

  return (
    <>
      <Button
        color="inherit"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        startIcon={pagesIcon}
      >
        {t('component')}
      </Button>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={handleClose()}>
        {PAGES.map((c) => (
          <MenuItem
            key={c}
            value={c}
            dense
            onClick={handleClose(c)}
            selected={c === component}
          >
            {t(`component_${Utility.camelToSnake(c)}`)}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
