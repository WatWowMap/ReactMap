// @ts-check
import * as React from 'react'
import Typography from '@mui/material/Typography'

/**
 *
 * @param {import('@mui/material').TypographyProps} props
 * @returns
 */
export function CustomText({ className, variant, sx, color, style, children }) {
  return (
    <Typography
      className={className}
      variant={variant}
      color={color}
      style={style}
      sx={sx}
    >
      {children}
    </Typography>
  )
}
