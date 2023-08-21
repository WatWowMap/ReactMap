import * as React from 'react'
import { styled } from '@mui/material/styles'

const Img = styled('img')``

export default function CustomImg({ style, sx, ...props }) {
  return <Img {...props} style={style} sx={sx} />
}
