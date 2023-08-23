// @ts-check
import * as React from 'react'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'

import { toggleEditor, usePlayStore } from './store'

export function ToggleEditor() {
  const hideEditor = usePlayStore((s) => s.hideEditor)

  return (
    <FormControlLabel
      control={
        <Checkbox
          size="small"
          checked={hideEditor}
          onChange={toggleEditor}
          name="Hide Editor"
        />
      }
      value="Hide Editor"
      label="Hide Editor"
    />
  )
}
