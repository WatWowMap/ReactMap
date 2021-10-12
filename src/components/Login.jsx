import React from 'react'
import { withRouter } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Grid, Typography } from '@material-ui/core'
import TelegramLoginButton from 'react-telegram-login'

import DiscordLogin from './layout/general/DiscordLogin'

const Login = ({ clickedTwice, location, serverSettings }) => {
  const { t } = useTranslation()

  return (
    <Grid
      container
      direction="column"
      justifyContent="center"
      alignItems="center"
      style={{ minHeight: '95vh' }}
      spacing={4}
    >
      {serverSettings?.authMethods?.includes('discord') && (
      <Grid item>
        <DiscordLogin />
      </Grid>
      )}
      {serverSettings?.authMethods?.includes('telegram') && (
      <Grid item>
        <TelegramLoginButton
          botName="reactmap_bot"
          dataAuthUrl="/auth/telegram/callback"
          usePic={false}
          lang={localStorage.getItem('i18nextLng')}
        />
      </Grid>
      )}
      {clickedTwice && (
        <Grid item style={{ whiteSpace: 'pre-line' }}>
          <Typography style={{ color: 'white', margin: 20 }} align="center">
            {location.state ? t(location.state.message) : t('clickOnce')}
          </Typography>
        </Grid>
      )}
    </Grid>
  )
}

export default withRouter(Login)
