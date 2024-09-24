// @ts-check
import * as React from 'react'
import Collapse from '@mui/material/Collapse'
import List from '@mui/material/List'

/**
 * @param {{ open: boolean, children: React.ReactNode } & import('@mui/material').CollapseProps} props
 */
export function CollapsibleItem({ open, children, ...props }) {
  return (
    <Collapse in={open} timeout="auto" unmountOnExit {...props}>
      <List component="div" disablePadding>
        {children}
      </List>
    </Collapse>
  )
}
