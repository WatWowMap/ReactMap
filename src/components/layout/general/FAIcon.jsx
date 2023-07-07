import * as React from 'react'
import { useTheme } from '@material-ui/core/styles'

export default function FAIcon({ className, size, style, color }) {
  const theme = useTheme()
  return (
    <i
      className={className}
      style={{
        paddingLeft: 1.5,
        fontSize: size === 'small' ? 18 : 24,
        color: theme.palette[color]?.main || color || 'white',
        ...style,
      }}
    />
  )
}
