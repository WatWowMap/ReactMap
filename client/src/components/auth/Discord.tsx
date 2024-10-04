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
      bgcolor={bgcolor}
      href={href}
      size={size}
      startIcon={<I className="fab fa-discord" color="white" size={size} />}
      variant="contained"
      {...props}
    >
      {t(children)}
    </Button>
  )
}
