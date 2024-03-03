// @ts-check
import * as React from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Link from '@mui/material/Link'

/**
 * Wraps div in a link if the block has one, otherwise returns children
 * @param {{
 *  link?: string,
 *  href?: string,
 *  target?: string,
 *  color?: string,
 *  underline?: import("@mui/material/Link").LinkProps['underline'],
 *  style?: import('react').CSSProperties,
 *  referrerPolicy?: import('react-router-dom').LinkProps['referrerPolicy'],
 *  sx?: import("@mui/system").SxProps,
 *  children: React.ReactNode
 *  className?: string
 * }} props
 * @returns {React.ReactNode}
 */
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
}) {
  const url = link || href
  if (!url) return children
  const external = url.startsWith('http') || url.startsWith('/auth')

  return (
    <Link
      className={className}
      href={external ? url : null}
      to={external ? null : url}
      component={external ? 'a' : RouterLink}
      referrerPolicy={referrerPolicy}
      target={target}
      underline={underline}
      style={style}
      sx={sx}
    >
      {children}
    </Link>
  )
}
