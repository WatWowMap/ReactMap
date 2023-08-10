import * as React from 'react'
import { styled } from '@mui/material'

const Img = styled('img')``

export default function CustomImg({ style, sx, children, ...props }) {
  return (
    <Img {...props} style={style} sx={sx}>
      {children}
    </Img>
  )
}
