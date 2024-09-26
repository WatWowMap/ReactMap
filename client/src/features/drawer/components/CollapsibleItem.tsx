import * as React from 'react'
import Collapse from '@mui/material/Collapse'
import List from '@mui/material/List'

export function CollapsibleItem({
  open,
  children,
  ...props
}: {
  open: boolean
  children: React.ReactNode
} & import('@mui/material').CollapseProps) {
  return (
    <Collapse in={open} timeout="auto" unmountOnExit {...props}>
      <List component="div" disablePadding>
        {children}
      </List>
    </Collapse>
  )
}
