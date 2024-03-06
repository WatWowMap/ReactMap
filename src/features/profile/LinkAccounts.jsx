// @ts-check
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@apollo/client'
import Grid2 from '@mui/material/Unstable_Grid2/Grid2'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

import { useMemory } from '@store/useMemory'
import { Utility } from '@services/Utility'
import Query from '@services/Query'
import { METHODS } from '@assets/constants'

import { DiscordButton } from '@components/auth/Discord'
import { TelegramWidget } from '@components/auth/Telegram'
import { Notification } from '@components/Notification'

export function LinkAccounts() {
  const { t } = useTranslation()
  const auth = useMemory((s) => s.auth)
  const { discordAuthUrl, telegramAuthUrl, telegramBotName } = useMemory(
    (state) => state.config.customRoutes,
  )

  const [refreshing, setRefreshing] = React.useState(false)

  const [setWebhookStrategy] = useMutation(Query.user('setWebhookStrategy'))

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
            <Grid2 key={method} xs={12} textAlign="center">
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
            <Grid2 xs={6} sm={6} md={5} textAlign="center" padding="20px 0">
              <Typography>{t('select_webhook_strategy')}</Typography>
            </Grid2>
            <Grid2 xs={6} sm={6} md={5} textAlign="center">
              <Select
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
                style={{ minWidth: 100 }}
              >
                {METHODS.map((x) =>
                  auth[`${x}Id`] ? (
                    <MenuItem key={x} value={x}>
                      {Utility.getProperName(x)}
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
          severity="success"
          i18nKey="webhook_strategy_success"
          messages={[{ key: 'redirecting', variables: [] }]}
        />
      )}
    </>
  )
}
