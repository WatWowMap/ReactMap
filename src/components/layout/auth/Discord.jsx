import React from 'react'
import { Button, Icon, Typography } from '@material-ui/core'
import { useTranslation } from 'react-i18next'

export default function DiscordLogin({ href, text, size }) {
  const { t } = useTranslation()

  return (
    <Button
      variant="contained"
      style={{
        backgroundColor: 'rgb(114,136,218)',
        color: 'white',
        textAlign: 'center',
        minWidth: 140,
      }}
      size={size || 'large'}
      href={href || '/auth/discord/callback'}
      startIcon={<Icon className="fab fa-discord" style={{ fontSize: 30 }} />}
    >
      <Typography variant="h6" align="center">
        {text ? t(text) : t('login')}
      </Typography>
    </Button>
  )
}
