import * as React from 'react'
import Button from '@mui/material/Button'
import { useTranslation } from 'react-i18next'

import { I } from '../I'

/**
 *
 * @param {{ children?: string, bgcolor?: string } & import('@mui/material/Button').ButtonProps} props
 * @returns {JSX.Element}
 */
export function DiscordButton({
  href = '/auth/discord/callback',
  children = 'login',
  size = 'large',
  bgcolor = 'discord.main',
  ...props
}) {
  const { t } = useTranslation()

  return (
    <Button
      variant="contained"
      bgcolor={bgcolor}
      size={size}
      href={href}
      startIcon={<I className="fab fa-discord" size={size} color="white" />}
      {...props}
    >
      {t(children)}
    </Button>
  )
}
