// @ts-check
import * as React from 'react'
import { styled } from '@mui/material/styles'

const Img = styled('img')``

/**
 *
 * @param {React.ImgHTMLAttributes<HTMLImageElement> & { sx?: import('@mui/material').SxProps }} props
 * @returns
 */
export default function CustomImg({ style, sx, ...props }) {
  return <Img {...props} style={style} sx={sx} />
}
