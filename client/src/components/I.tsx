import type { ButtonProps } from '@mui/material'

import { styled } from '@mui/material/styles'

export const I = styled('i', {
  shouldForwardProp: (prop) => prop !== 'color' && prop !== 'size',
})<{ size?: ButtonProps['size'] }>(({ theme, style, size, color }) => ({
  paddingLeft: 1.5,
  fontSize: size === 'small' ? 18 : 24,
  color: color || theme.palette.text.primary,
  ...style,
}))
