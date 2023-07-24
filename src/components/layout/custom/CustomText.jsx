import React from 'react'
import { Typography } from '@mui/material'

import Utility from '@services/Utility'

import LinkWrapper from './LinkWrapper'

export default function CustomText({ block, isMuiColor = false }) {
  const text = (
    <Typography
      variant={block.variant}
      color={isMuiColor ? block.color : 'inherit'}
      style={block.style || { color: isMuiColor ? 'inherit' : block.color }}
    >
      {Utility.getBlockContent(block.content)}
    </Typography>
  )
  return block.link ? <LinkWrapper block={block} element={text} /> : text
}
