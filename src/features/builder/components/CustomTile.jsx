// @ts-check
import * as React from 'react'
import Grid from '@mui/material/Unstable_Grid2'

import { getGridSizes } from '@utils/getGridSizes'

import { Generator } from './Generator'

/**
 *
 * @param {{ block: object, defaultReturn?: React.ReactNode | null }} props
 * @returns
 */
export function CustomTile({ block, defaultReturn }) {
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
