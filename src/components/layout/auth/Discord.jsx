import * as React from 'react'
import Button from '@mui/material/Button'
import { useTranslation } from 'react-i18next'

import { I } from '../general/I'

/**
 *
 * @param {{ children?: string, href?: string, size?: import('@mui/material').ButtonProps['size'], bgcolor?: string }} props
 * @returns {JSX.Element}
 */
export default function DiscordLogin({
  href = '/auth/discord/callback',
  children = 'login',
  size = 'large',
  bgcolor = 'discord.main',
}) {
  const { t } = useTranslation()

  return (
    <Button
      variant="contained"
      bgcolor={bgcolor}
      size={size}
      href={href}
      startIcon={<I className="fab fa-discord" size={size} />}
    >
      {t(children)}
    </Button>
  )
}
