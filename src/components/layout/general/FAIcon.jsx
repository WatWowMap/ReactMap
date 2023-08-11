// @ts-check
import * as React from 'react'
import { useTheme } from '@mui/material/styles'

/**
 * Wrapper for Font Awesome icons
 * @param {{
 *  className?: string,
 *  size?: 'small' | 'medium',
 *  style?: React.CSSProperties,
 *  color?: string
 * }} param0
 * @returns {JSX.Element}
 */
export default function FAIcon({
  className,
  size = 'medium',
  style,
  color = 'white',
}) {
  const theme = useTheme()
  return (
    <i
      className={className}
      style={{
        paddingLeft: 1.5,
        fontSize: size === 'small' ? 18 : 24,
        color: color in theme.palette ? theme.palette[color]?.main : color,
        ...style,
      }}
    />
  )
}
