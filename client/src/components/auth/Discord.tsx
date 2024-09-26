import Button, { ButtonProps } from '@mui/material/Button'
import { useTranslation } from 'react-i18next'

import { I } from '../I'

export function DiscordButton({
  href = '/auth/discord/callback',
  children = 'login',
  size = 'large',
  bgcolor = 'discord.main',
  ...props
}: ButtonProps & { children?: string; bgcolor?: string }) {
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
