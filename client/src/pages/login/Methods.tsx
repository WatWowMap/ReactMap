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
      alignItems="center"
      direction="row"
      justifyContent="center"
      xs={12}
    >
      <Grid
        sm={discordInvite ? 6 : 10}
        textAlign="center"
        xs={discordInvite ? +t('login_button') : 10}
      >
        <DiscordButton bgcolor="success.dark" href={discordAuthUrl} />
      </Grid>
      {discordInvite && (
        <Grid sm={6} textAlign="center" xs={+t('join_button')}>
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
      <TelegramWidget authUrl={telegramAuthUrl} botName={telegramBotName} />
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
