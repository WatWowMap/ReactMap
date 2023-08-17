import * as React from 'react'
import Typography from '@mui/material/Typography'

export default function CustomText({ variant, sx, color, style, children }) {
  return (
    <Typography variant={variant} color={color} style={style} sx={sx}>
      {children}
    </Typography>
  )
}
