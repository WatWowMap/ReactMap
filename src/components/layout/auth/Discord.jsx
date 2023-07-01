import React from 'react'
import { Button, Typography } from '@material-ui/core'
import { useTranslation } from 'react-i18next'
import FAIcon from '../general/FAIcon'

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
      startIcon={<FAIcon className="fab fa-discord" style={{ fontSize: 25 }} />}
    >
      <Typography variant="h6" align="center">
        {text ? t(text) : t('login')}
      </Typography>
    </Button>
  )
}
