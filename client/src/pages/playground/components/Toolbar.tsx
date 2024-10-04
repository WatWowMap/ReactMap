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
    <AppBar enableColorOnDark color="secondary" position="static">
      <Toolbar variant="dense">
        <MainMenu />
        <ComponentMenu />
        <LocaleMenu />
        <Box flexGrow={1} />
        <Typography
          color="inherit"
          component="div"
          display={{ xs: 'none', sm: 'block' }}
          variant="h6"
        >
          {t('playground')}
        </Typography>
      </Toolbar>
    </AppBar>
  )
}
