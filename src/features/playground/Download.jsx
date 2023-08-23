// @ts-check
import * as React from 'react'
import Button from '@mui/material/Button'

import { handleDownload, usePlayStore } from './store'

export function Download() {
  const valid = usePlayStore((s) => s.valid)
  return (
    <Button color="secondary" onClick={handleDownload} disabled={!valid}>
      Download JSON
    </Button>
  )
}
