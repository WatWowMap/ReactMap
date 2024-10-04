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
      bgcolor={isMuiColor ? undefined : color}
      className={className}
      color={isMuiColor ? color : undefined}
      size={size}
      startIcon={
        icon ? <I className={icon} style={{ fontSize: 30 }} /> : undefined
      }
      style={style}
      sx={sx}
      variant={variant}
    >
      {children}
    </Button>
  )
}
