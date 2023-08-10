// @ts-check
/* eslint-disable react/no-array-index-key */
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Typography } from '@mui/material'
import Grid from '@mui/material/Unstable_Grid2/'

import LocalLogin from './Local'
import LocaleSelection from '../general/LocaleSelection'
import DiscordLogin from './Discord'
import TelegramLogin from './Telegram'
import CustomTile from '../custom/CustomTile'
import ThemeToggle from '../general/ThemeToggle'

export default function Login({ serverSettings }) {
  const { t } = useTranslation()
  const { settings, components } = serverSettings.config.map.loginPage

  return (
    <>
      <Box position="absolute" top={10} right={10}>
        <ThemeToggle />
      </Box>
      {components?.length ? (
        <Grid
          container
          spacing={settings.parentSpacing || 0}
          alignItems={settings.parentAlignItems || 'center'}
          justifyContent={settings.parentJustifyContent || 'center'}
          style={settings.parentStyle || {}}
          sx={settings.parentSx || {}}
        >
          {components.map((block, i) => (
            <CustomTile key={i} block={block} />
          ))}
        </Grid>
      ) : (
        <Grid
          container
          direction="column"
          justifyContent="center"
          alignItems="center"
          height={{ xs: '90vh', sm: '100vh' }}
          width="100%"
        >
          <Grid pb={8} xs={12}>
            <Typography variant="h3" align="center">
              {t('welcome')} {serverSettings.config.map.headerTitle}
            </Typography>
          </Grid>
          {serverSettings?.authMethods?.includes('discord') && (
            <Grid
              container
              justifyContent="center"
              alignItems="center"
              direction="row"
              xs={12}
            >
              <Grid
                xs={
                  serverSettings.config.map.discordInvite
                    ? t('login_button')
                    : 10
                }
                sm={serverSettings.config.map.discordInvite ? 3 : 10}
                textAlign="center"
              >
                <DiscordLogin href={serverSettings.config.map.discordAuthUrl} />
              </Grid>
              {serverSettings.config.map.discordInvite && (
                <Grid xs={t('join_button')} sm={3} textAlign="center">
                  <DiscordLogin
                    href={serverSettings.config.map.discordInvite}
                    text="join"
                  />
                </Grid>
              )}
            </Grid>
          )}
          {serverSettings?.authMethods?.includes('telegram') && (
            <Grid>
              <TelegramLogin
                botName={serverSettings.config.map.telegramBotName}
                authUrl={serverSettings.config.map.telegramAuthUrl}
              />
            </Grid>
          )}
          {serverSettings?.authMethods?.includes('local') && (
            <Grid>
              <LocalLogin href={serverSettings.config.map.localAuthUrl} />
            </Grid>
          )}
        </Grid>
      )}
      {!components?.length && (
        <Box
          position="absolute"
          bottom={20}
          left={0}
          right={0}
          mx="auto"
          width={{ xs: '50%', sm: '33%', md: '25%', lg: '20%' }}
        >
          <LocaleSelection />
        </Box>
      )}
    </>
  )
}
