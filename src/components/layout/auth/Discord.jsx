import React from 'react'
import { Button, darken } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { I } from '../general/I'

export default function DiscordLogin({ href, text, size }) {
  const { t } = useTranslation()

  return (
    <Button
      variant="contained"
      sx={{
        bgcolor: 'rgb(114,136,218)',
        '&:hover': {
          bgcolor: darken('rgb(114,136,218)', 0.2),
        },
      }}
      size={size || 'large'}
      href={href || '/auth/discord/callback'}
      startIcon={<I className="fab fa-discord" size={size || 'large'} />}
    >
      {text ? t(text) : t('login')}
    </Button>
  )
}
