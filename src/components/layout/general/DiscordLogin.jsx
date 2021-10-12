import React from 'react'
import { Button, Icon, Typography } from '@material-ui/core'
import { useTranslation } from 'react-i18next'

export default function DiscordLogin() {
  const { t } = useTranslation()

  return (
    <Button
      variant="contained"
      style={{
        backgroundColor: 'rgb(114,136,218)',
        color: 'white',
      }}
      size="large"
      href="/auth/discord"
    >
      <Icon className="fab fa-discord" style={{ fontSize: 30 }} />&nbsp;
      <Typography variant="h6" align="center">
        {t('login')}
      </Typography>
    </Button>
  )
}
