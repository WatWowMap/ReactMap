import * as React from 'react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import { useTranslation } from 'react-i18next'

import { ComponentMenu } from './ComponentMenu'
import { LocaleMenu } from './LocaleMenu'
import { MainMenu } from './MainMenu'

export function MuiToolbar() {
  const { t } = useTranslation()

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar
          variant="dense"
          sx={{
            '> *': {
              mr: 2,
            },
          }}
        >
          <MainMenu />
          <ComponentMenu />
          <LocaleMenu />
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="h6" color="inherit" component="div" mr={0}>
            {t('playground')}
          </Typography>
        </Toolbar>
      </AppBar>
    </Box>
  )
}
