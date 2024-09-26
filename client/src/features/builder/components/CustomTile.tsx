// @ts-check
import * as React from 'react'
import Grid from '@mui/material/Unstable_Grid2'

import { Generator } from './Generator'
import { getGridSizes } from '../utils'
import type { CustomComponent } from '@rm/types'

export function CustomTile({
  block,
  defaultReturn,
}: {
  block: CustomComponent
  defaultReturn?: React.ReactNode
}) {
  return block.type === 'parent' ? (
    <Generator block={block} defaultReturn={defaultReturn} />
  ) : (
    <Grid
      {...getGridSizes(block.gridSizes)}
      className={block.className}
      style={block.gridStyle}
      sx={block.sx}
    >
      <Generator block={block} defaultReturn={defaultReturn} />
    </Grid>
  )
}
