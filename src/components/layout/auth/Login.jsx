/* eslint-disable react/no-array-index-key */
import React from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Grid, Typography, useMediaQuery } from '@material-ui/core'
import { useTheme } from '@material-ui/styles'

import LocalLogin from './Local'
import LocaleSelection from '../general/LocaleSelection'
import DiscordLogin from './Discord'
import TelegramLogin from './Telegram'
import CustomTile from '../custom/CustomTile'

export default function Login({ clickedTwice, serverSettings, getServerSettings }) {
  const location = useLocation()
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.only('xs'))
  const { settings, components } = serverSettings.config.map.loginPage

  return components.length ? (
    <Grid
      container
      spacing={settings.parentSpacing || 0}
      alignItems={settings.parentAlignItems || 'center'}
      justifyContent={settings.parentJustifyContent || 'center'}
      style={settings.parentStyle || {}}
    >
      {components.map((block, i) => (
        <CustomTile
          key={i}
          block={block}
          defaultReturn={null}
          serverSettings={serverSettings}
          getServerSettings={getServerSettings}
        />
      ))}
    </Grid>
  ) : (
    <Grid
      container
      direction="column"
      justifyContent="center"
      alignItems="center"
      style={{ minHeight: '95vh', width: '100%' }}
    >
      <Grid item style={{ marginTop: 20, marginBottom: 20 }}>
        <Typography variant="h3" style={{ color: 'white' }} align="center">
          {t('welcome')} {serverSettings.config.map.headerTitle}
        </Typography>
      </Grid>
      {serverSettings?.authMethods?.includes('discord') && (
        <Grid container item justifyContent="center" alignItems="center" style={{ marginTop: 20, marginBottom: 20 }}>
          <Grid
            item
            xs={serverSettings.config.map.discordInvite ? t('login_button') : 10}
            sm={serverSettings.config.map.discordInvite ? 3 : 10}
            style={{ textAlign: 'center', marginTop: serverSettings.config.map.discordAuthUrl ? 20 : 0 }}
          >
            <DiscordLogin href={serverSettings.config.map.discordAuthUrl} />
          </Grid>
          {serverSettings.config.map.discordInvite && (
            <Grid item xs={t('join_button')} sm={3} style={{ textAlign: 'center', marginTop: 20 }}>
              <DiscordLogin href={serverSettings.config.map.discordInvite} text="join" />
            </Grid>
          )}
        </Grid>
      )}
      {serverSettings?.authMethods?.includes('telegram') && (
        <Grid item style={{ marginTop: 20, marginBottom: 20 }}>
          <TelegramLogin
            botName={serverSettings.config.map.telegramBotName}
            authUrl={serverSettings.config.map.telegramAuthUrl}
          />
        </Grid>
      )}
      {serverSettings?.authMethods?.includes('local') && (
        <Grid item style={{ marginTop: 20, marginBottom: 20 }}>
          <LocalLogin
            href={serverSettings.config.map.localAuthUrl}
            serverSettings={serverSettings}
            getServerSettings={getServerSettings}
          />
        </Grid>
      )}
      {clickedTwice && (
        <Grid item style={{ whiteSpace: 'pre-line' }}>
          <Typography style={{ color: 'white', margin: 20 }} align="center">
            {location.state ? t(location.state.message) : t('click_once')}
          </Typography>
        </Grid>
      )}
      <Grid item style={{ marginTop: 20, marginBottom: 20, bottom: 0, position: 'absolute', width: isMobile ? '50%' : '20%' }}>
        <LocaleSelection localeSelection={serverSettings.config.localeSelection} />
      </Grid>
    </Grid>
  )
}
