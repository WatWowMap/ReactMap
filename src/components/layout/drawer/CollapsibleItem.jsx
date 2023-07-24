/* eslint-disable no-unused-vars */
import * as React from 'react'
import Collapse from '@mui/material/Collapse'
import ListItem from '@mui/material/ListItem'
import List from '@mui/material/List'

export default function CollapsibleItem({ open, children }) {
  return (
    <Collapse in={open} timeout="auto" unmountOnExit>
      <List component="div" disablePadding>
        {children}
      </List>
    </Collapse>
  )
}
