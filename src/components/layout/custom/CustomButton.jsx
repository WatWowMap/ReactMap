import * as React from 'react'
import { Button, darken } from '@mui/material'

import FAIcon from '../general/FAIcon'

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
      startIcon={
        icon ? <FAIcon className={icon} style={{ fontSize: 30 }} /> : null
      }
    >
      {children}
    </Button>
  )
}
