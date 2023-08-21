// @ts-check
import * as React from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Link from '@mui/material/Link'

/**
 * Wraps div in a link if the block has one, otherwise returns children
 * @param {{
 *  link?: string,
 *  target?: string,
 *  linkColor?: string,
 *  underline?: import("@mui/material/Link").LinkProps['underline'],
 *  style?: import('react').CSSProperties,
 *  sx?: import("@mui/system").SxProps,
 *  children: React.ReactNode
 * }} props
 * @returns {React.ReactNode}
 */
export default function LinkWrapper({
  link,
  target,
  linkColor,
  underline,
  style,
  sx,
  children,
}) {
  if (!link) return children
  const external = link.startsWith('http')

  return (
    <Link
      href={external ? link : null}
      to={external ? null : link}
      rel={external ? 'noopener noreferrer' : null}
      target={target ?? (external ? '_blank' : null)}
      color={linkColor}
      underline={underline}
      sx={[style, ...(Array.isArray(sx) ? sx : [sx])]}
      component={external ? 'a' : RouterLink}
    >
      {children}
    </Link>
  )
}
