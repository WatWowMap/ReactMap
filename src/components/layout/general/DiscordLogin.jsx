import React from 'react'
import { Button, Icon, Typography } from '@material-ui/core'
import { useTranslation } from 'react-i18next'

export default function DiscordLogin({ href, text }) {
  const { t } = useTranslation()

  return (
    <Button
      variant="contained"
      style={{
        backgroundColor: 'rgb(114,136,218)',
        color: 'white',
        textAlign: 'center',
      }}
      size="large"
      href={href || '/auth/discord'}
    >
      <Icon className="fab fa-discord" style={{ fontSize: 30 }} />&nbsp;
      <Typography variant="h6" align="center">
        {text ? t(text) : t('login')}
      </Typography>
    </Button>
  )
}
