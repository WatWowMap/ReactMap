// @ts-check
import * as React from 'react'
import Collapse from '@mui/material/Collapse'
import List from '@mui/material/List'

/**
 * @param {{ open: boolean, children: React.ReactNode }} props
 */
export function CollapsibleItem({ open, children }) {
  return (
    <Collapse in={open} timeout="auto" unmountOnExit>
      <List component="div" disablePadding>
        {children}
      </List>
    </Collapse>
  )
}
