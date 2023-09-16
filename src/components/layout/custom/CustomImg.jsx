// @ts-check
import * as React from 'react'
import { styled } from '@mui/material/styles'
import Typography from '@mui/material/Typography'

/**
 * @typedef {React.ImgHTMLAttributes<HTMLImageElement>} ImgProps
 * @typedef {{ maxHeight: React.CSSProperties['maxHeight'], maxWidth: React.CSSProperties['maxWidth'], sx?: import('@mui/material').SxProps }} ExtraProps
 * @typedef {ImgProps & Partial<ExtraProps>} Props
 */

/**
 * @type {React.FC<Props>}
 */
export const Img = styled('img', {
  shouldForwardProp: (prop) => prop !== 'maxWidth' && prop !== 'maxHeight',
})((/** @type {Props} */ { maxWidth, maxHeight }) => ({
  maxWidth,
  maxHeight,
}))

/**
 * A small wrapper around the Img component to display an icon next to text
 *
 * The image is 15x15px
 * @param {import('@mui/material').TypographyProps & {
 *    src: string,
 *    alt?: string,
 *    imgMaxWidth?: number,
 *    imgMaxHeight?: number
 * }} props
 * @returns
 */
export const TextWithIcon = ({
  children,
  src,
  alt = typeof children === 'string' ? children : src,
  imgMaxHeight = 15,
  imgMaxWidth = 15,
  ...props
}) => (
  <Typography variant="caption" className="flex-center" {...props}>
    {children}
    &nbsp;
    <Img src={src} alt={alt} maxHeight={imgMaxHeight} maxWidth={imgMaxWidth} />
  </Typography>
)
