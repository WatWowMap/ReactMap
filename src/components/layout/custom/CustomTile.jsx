/* eslint-disable react/jsx-props-no-spreading */
import React from 'react'
import { Grid } from '@material-ui/core'

import Utility from '@services/Utility'

import Generator from './Generator'

export default function CustomTile({ block, defaultReturn }) {
  return (
    <Grid
      item
      {...Utility.getSizes(block.gridSizes)}
      style={block.gridStyle || { textAlign: 'center' }}
    >
      <Generator
        block={block}
        defaultReturn={defaultReturn}
      />
    </Grid>
  )
}
