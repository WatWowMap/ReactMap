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
      <Grid item>
        <Typography variant="h3" style={{ color: 'white' }}>
          {t('welcome')} {serverSettings.config.map.headerTitle}
        </Typography>
      </Grid>
      {serverSettings?.authMethods?.includes('discord') && (
        <Grid container item justifyContent="center" alignItems="center" spacing={2}>
          <Grid
            item
            xs={serverSettings.config.map.discordInvite ? 3 : 6}
            style={{ textAlign: serverSettings.config.map.discordInvite ? 'right' : 'center' }}
          >
            <DiscordLogin />
          </Grid>
          {serverSettings.config.map.discordInvite && (
            <Grid item xs={3} style={{ textAlign: 'left' }}>
              <DiscordLogin href={serverSettings.config.map.discordInvite} text="join" />
            </Grid>
          )}
        </Grid>
      )}
      {serverSettings?.authMethods?.includes('telegram') && (
        <Grid item>
          <TelegramLoginButton
            botName={process.env?.TELEGRAM_BOT_NAME}
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
