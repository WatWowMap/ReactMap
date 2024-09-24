// @ts-check
import * as React from 'react'
import { styled } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import { useMemory } from '@store/useMemory'
import { useTranslateById } from '@hooks/useTranslateById'
import { NameTT } from './popups/NameTT'

/**
 * @typedef {React.ImgHTMLAttributes<HTMLImageElement>} ImgProps
 * @typedef {Pick<React.CSSProperties, 'maxWidth' | 'minWidth' | 'maxHeight' | 'minHeight' | 'zIndex'> & { sx?: import('@mui/material').SxProps }} ExtraProps
 * @typedef {ImgProps & Partial<ExtraProps>} Props
 */

/** @type {React.FC<Props>} */
export const Img = styled('img', {
  shouldForwardProp: (prop) =>
    prop !== 'maxWidth' &&
    prop !== 'maxHeight' &&
    prop !== 'zIndex' &&
    prop !== 'minHeight' &&
    prop !== 'minWidth',
})(
  (
    /** @type {Props} */ { maxWidth, maxHeight, minHeight, minWidth, zIndex },
  ) => ({
    maxWidth,
    maxHeight,
    minHeight,
    minWidth,
    zIndex,
  }),
)

/**
 * A small wrapper around the Img component to display an icon next to text
 *
 * The image defaults to 15x15px
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

/**
 *
 * @param {{
 *  id: number,
 *  form?: number,
 *  evolution?: number,
 *  gender?: number,
 *  costume?: number,
 *  alignment?: number,
 *  shiny?: boolean,
 *  bread?: number,
 * } & Omit<Props, 'id'>} props
 * @returns
 */
export const PokemonImg = ({
  id,
  form = 0,
  evolution = 0,
  gender = 0,
  costume = 0,
  alignment = 0,
  shiny = false,
  bread = 0,
  ...props
}) => {
  const src = useMemory((s) =>
    s.Icons.getPokemon(
      id,
      form,
      evolution,
      gender,
      costume,
      alignment,
      shiny,
      bread,
    ),
  )
  const alt = useTranslateById().t(`${id}-${form}`)

  return (
    <NameTT title={alt}>
      <Img alt={alt} src={src} {...props} />
    </NameTT>
  )
}
