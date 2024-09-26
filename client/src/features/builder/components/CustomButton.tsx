import Button from '@mui/material/Button'

import { I } from '@components/I'

const THEME_COLORS = new Set([
  'success',
  'warning',
  'error',
  'info',
  'primary',
  'secondary',
  'inherit',
])

export function CustomButton({
  size,
  color = 'inherit',
  variant = 'text',
  style = {},
  sx,
  icon = null,
  children,
  className,
}: import('@mui/material').ButtonProps & { icon?: string }) {
  const isMuiColor = THEME_COLORS.has(color)
  return (
    // TODO: Augment Mui Types
    <Button
      className={className}
      size={size}
      color={isMuiColor ? color : undefined}
      bgcolor={isMuiColor ? undefined : color}
      variant={variant}
      style={style}
      sx={sx}
      startIcon={
        icon ? <I className={icon} style={{ fontSize: 30 }} /> : undefined
      }
    >
      {children}
    </Button>
  )
}
