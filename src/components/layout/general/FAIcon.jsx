import * as React from 'react'
import { useTheme } from '@material-ui/core/styles'

export default function FAIcon({ className, size, style, color }) {
  const theme = useTheme()
  return (
    <i
      className={className}
      style={{
        fontSize: size === 'small' ? 18 : 25,
        color: theme.palette[color]?.main || color || 'white',
        ...style,
      }}
    />
  )
}
