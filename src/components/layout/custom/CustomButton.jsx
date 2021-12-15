import React from 'react'
import { Button, Icon, Typography } from '@material-ui/core'
import LinkWrapper from './LinkWrapper'

export default function CustomButton({ block, isMuiColor = false }) {
  const button = (
    <Button
      size={block.size}
      color={isMuiColor ? block.color : 'inherit'}
      variant={block.variant}
      style={block.style || { color: isMuiColor ? 'inherit' : block.color }}
    >
      {Boolean(block.icon) && <Icon className={block.icon} style={{ fontSize: 30 }} />}&nbsp;
      <Typography variant="button" align="right">
        {block.content}
      </Typography>
    </Button>
  )
  return block.link ? <LinkWrapper block={block} element={button} /> : button
}
