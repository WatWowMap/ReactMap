import * as React from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Link from '@mui/material/Link'

export function LinkWrapper({
  link,
  href,
  target,
  referrerPolicy,
  underline,
  style,
  sx,
  children,
  className,
}: {
  link?: string
  href?: string
  target?: string
  color?: string
  underline?: import('@mui/material/Link').LinkProps['underline']
  style?: import('react').CSSProperties
  referrerPolicy?: import('react-router-dom').LinkProps['referrerPolicy']
  sx?: import('@mui/system').SxProps
  children: React.ReactNode
  className?: string
}): React.ReactNode {
  const url = link || href

  if (!url) return children
  const external = url.startsWith('http') || url.startsWith('/auth')

  return (
    <Link
      className={className}
      component={external ? 'a' : RouterLink}
      href={external ? url : null}
      referrerPolicy={referrerPolicy}
      style={style}
      sx={sx}
      target={target}
      to={external ? null : url}
      underline={underline}
    >
      {children}
    </Link>
  )
}
