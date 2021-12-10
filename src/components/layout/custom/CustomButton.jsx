import React from 'react'
import { Button } from '@material-ui/core'
import LinkWrapper from './LinkWrapper'

export default function CustomButton({ block, isMuiColor = false }) {
  const button = (
    <Button
      size={block.size}
      color={isMuiColor ? block.color : 'inherit'}
      variant={block.variant}
      style={block.style || { color: isMuiColor ? 'inherit' : block.color }}
    >
      {block.content}
    </Button>
  )
  return block.link ? <LinkWrapper block={block} element={button} /> : button
}
