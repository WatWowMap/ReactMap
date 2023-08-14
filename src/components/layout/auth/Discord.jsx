import React from 'react'
import { Button, darken } from '@mui/material'
import { useTranslation } from 'react-i18next'
import FAIcon from '../general/FAIcon'

export default function DiscordLogin({ href, text, size }) {
  const { t } = useTranslation()

  return (
    <Button
      variant="contained"
      sx={{
        bgcolor: 'rgb(117,218,114)',
        '&:hover': {
          bgcolor: darken('rgb(117,218,114)', 0.2),
        },
      }}
      size={size || 'large'}
      href={href || '/auth/discord/callback'}
      startIcon={<FAIcon className="fab fa-discord" size={size || 'large'} />}
    >
      {text ? t(text) : t('login')}
    </Button>
  )
}
