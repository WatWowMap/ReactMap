// @ts-check
import * as React from 'react'
import Grid from '@mui/material/Unstable_Grid2'
import { useTranslation } from 'react-i18next'

import { DiscordButton } from '@components/auth/Discord'
import { TelegramWidget } from '@components/auth/Telegram'
import { LocalLogin } from '@components/auth/Local'
import { useMemory } from '@store/useMemory'

function Discord() {
  const { t } = useTranslation()
  const discordInvite = useMemory((s) => s.config.links.discordInvite)
  const discordAuthUrl = useMemory((s) => s.config.customRoutes.discordAuthUrl)

  return (
    <Grid
      container
      justifyContent="center"
      alignItems="center"
      direction="row"
      xs={12}
    >
      <Grid
        xs={discordInvite ? t('login_button') : 10}
        sm={discordInvite ? 6 : 10}
        textAlign="center"
      >
        <DiscordButton href={discordAuthUrl} bgcolor="success.dark" />
      </Grid>
      {discordInvite && (
        <Grid xs={t('join_button')} sm={6} textAlign="center">
          <DiscordButton href={discordInvite}>join</DiscordButton>
        </Grid>
      )}
    </Grid>
  )
}

function Telegram() {
  const telegramBotName = useMemory(
    (s) => s.config.customRoutes.telegramBotName,
  )
  const telegramAuthUrl = useMemory(
    (s) => s.config.customRoutes.telegramAuthUrl,
  )
  return (
    <Grid>
      <TelegramWidget botName={telegramBotName} authUrl={telegramAuthUrl} />
    </Grid>
  )
}

function Local() {
  const localAuthUrl = useMemory((s) => s.config.customRoutes.localAuthUrl)
  return (
    <Grid>
      <LocalLogin href={localAuthUrl} />
    </Grid>
  )
}

export const methods = {
  discord: <Discord />,
  telegram: <Telegram />,
  local: <Local />,
}
