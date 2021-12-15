import React from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Link } from '@material-ui/core'

export default function LinkWrapper({ block, element }) {
  return block.link.startsWith('http') ? (
    <Link
      href={block.link}
      rel="noreferrer"
      target="blank"
      color={block.linkColor}
      underline={block.underline}
    >
      {element}
    </Link>
  ) : (
    <RouterLink
      to={block.link}
      style={block.style}
    >
      {element}
    </RouterLink>
  )
}
