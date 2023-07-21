import React from 'react'
import { Button, Typography } from '@mui/material'

import Utility from '@services/Utility'

import LinkWrapper from './LinkWrapper'
import FAIcon from '../general/FAIcon'

export default function CustomButton({ block, isMuiColor = false }) {
  const button = (
    <Button
      size={block.size}
      color={isMuiColor ? block.color : 'inherit'}
      variant={block.variant}
      href={block.href}
      style={block.style || { color: isMuiColor ? 'inherit' : block.color }}
    >
      {Boolean(block.icon) && (
        <FAIcon className={block.icon} style={{ fontSize: 30 }} />
      )}
      &nbsp;
      <Typography variant="button" align="right">
        {Utility.getBlockContent(block.content)}
      </Typography>
    </Button>
  )
  return block.link ? <LinkWrapper block={block} element={button} /> : button
}
