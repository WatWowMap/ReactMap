import * as React from 'react'
import { darken } from '@mui/material/styles'
import Button from '@mui/material/Button'

import { I } from '../general/I'

const THEME_COLORS = new Set([
  'success',
  'warning',
  'error',
  'info',
  'primary',
  'secondary',
  'inherit',
])

export default function CustomButton({
  size,
  color = 'inherit',
  variant = 'text',
  style = {},
  icon = null,
  children,
}) {
  const isMuiColor = THEME_COLORS.has(color)
  return (
    <Button
      size={size}
      color={isMuiColor ? color : undefined}
      variant={variant}
      sx={{
        ...style,
        color: isMuiColor ? undefined : color,
        '&:hover': {
          ...style['&:hover'],
          bgcolor:
            style.backgroundColor && !THEME_COLORS.has(style.backgroundColor)
              ? darken(style.backgroundColor, 0.2)
              : 'inherit',
        },
      }}
      startIcon={icon ? <I className={icon} style={{ fontSize: 30 }} /> : null}
    >
      {children}
    </Button>
  )
}
