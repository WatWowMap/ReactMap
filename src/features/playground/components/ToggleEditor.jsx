// @ts-check
import * as React from 'react'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'

import { toggleEditor, usePlayStore } from '../hooks/store'

export function ToggleEditor() {
  const hideEditor = usePlayStore((s) => s.hideEditor)

  return (
    <MenuItem onClick={toggleEditor} dense>
      <ListItemIcon>
        {hideEditor ? <VisibilityOff /> : <Visibility />}
      </ListItemIcon>
      <ListItemText>{hideEditor ? 'Show Editor' : 'Hide Editor'}</ListItemText>
    </MenuItem>
  )
}
