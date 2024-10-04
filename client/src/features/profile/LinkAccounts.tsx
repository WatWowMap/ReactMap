import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@apollo/client'
import Grid2 from '@mui/material/Unstable_Grid2'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { useMemory } from '@store/useMemory'
import { Query } from '@services/queries'
import { METHODS } from '@assets/constants'
import { DiscordButton } from '@components/auth/Discord'
import { TelegramWidget } from '@components/auth/Telegram'
import { Notification } from '@components/Notification'
import { getProperName } from '@utils/strings'

export function LinkAccounts() {
  const { t } = useTranslation()
  const auth = useMemory((s) => s.auth)
  const { discordAuthUrl, telegramAuthUrl, telegramBotName } = useMemory(
    (s) => s.config.customRoutes,
  )

  const [refreshing, setRefreshing] = React.useState(false)

  const [setWebhookStrategy] = useMutation(Query.user('SET_WEBHOOK_STRATEGY'))

  if (refreshing) {
    setTimeout(() => window.location.reload(), 2000)
  }

  return (
    <>
      <Grid2 container alignItems="center" justifyContent="center">
        {METHODS.map((method, i) => {
          if (!auth.methods.includes(method)) return null
          const Component = i ? (
            <TelegramWidget
              authUrl={telegramAuthUrl}
              botName={telegramBotName}
            />
          ) : (
            <DiscordButton href={discordAuthUrl} size="medium">
              {t('link_discord')}
            </DiscordButton>
          )

          return (
            <Grid2 key={method} textAlign="center" xs={12}>
              {auth[`${method}Id`] ? (
                <Typography color="secondary">
                  {t('user_username')}: {auth.username} ({t(`${method}_linked`)}
                  )
                </Typography>
              ) : (
                Component
              )}
            </Grid2>
          )
        })}
        {auth.discordId && auth.telegramId && (
          <Grid2 container alignItems="center" justifyContent="center">
            <Grid2 md={5} padding="20px 0" sm={6} textAlign="center" xs={6}>
              <Typography>{t('select_webhook_strategy')}</Typography>
            </Grid2>
            <Grid2 md={5} sm={6} textAlign="center" xs={6}>
              <Select
                style={{ minWidth: 100 }}
                value={auth.webhookStrategy || ''}
                onChange={(e) => {
                  setWebhookStrategy({
                    variables: {
                      strategy: e.target.value,
                    },
                  })
                  useMemory.setState((prev) => ({
                    auth: { ...prev.auth, webhookStrategy: e.target.value },
                  }))
                  setRefreshing(true)
                }}
              >
                {METHODS.map((x) =>
                  auth[`${x}Id`] ? (
                    <MenuItem key={x} value={x}>
                      {getProperName(x)}
                    </MenuItem>
                  ) : null,
                )}
              </Select>
            </Grid2>
          </Grid2>
        )}
      </Grid2>
      {refreshing && (
        <Notification
          i18nKey="webhook_strategy_success"
          messages={[{ key: 'redirecting', variables: [] }]}
          severity="success"
        />
      )}
    </>
  )
}
