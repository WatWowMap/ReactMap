// @ts-check
import * as React from 'react'
import { styled } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import { useMemory } from '@store/useMemory'
import { useTranslateById } from '@hooks/useTranslateById'

import { NameTT } from './popups/NameTT'

export interface ImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {}

type ExtraProps = Pick<
  React.CSSProperties,
  'maxWidth' | 'minWidth' | 'maxHeight' | 'minHeight' | 'zIndex'
> & { sx?: import('@mui/material').SxProps }

type Props = ImgProps & Partial<ExtraProps>

export const Img = styled('img', {
  shouldForwardProp: (prop) =>
    prop !== 'maxWidth' &&
    prop !== 'maxHeight' &&
    prop !== 'zIndex' &&
    prop !== 'minHeight' &&
    prop !== 'minWidth',
})<Props>(({ maxWidth, maxHeight, minHeight, minWidth, zIndex }) => ({
  maxWidth,
  maxHeight,
  minHeight,
  minWidth,
  zIndex,
}))

/**
 * A small wrapper around the Img component to display an icon next to text
 *
 * The image defaults to 15x15px
 */
export function TextWithIcon({
  children,
  src,
  alt = typeof children === 'string' ? children : src,
  imgMaxHeight = 15,
  imgMaxWidth = 15,
  ...props
}: import('@mui/material').TypographyProps & {
  src: string
  alt?: string
  imgMaxWidth?: number
  imgMaxHeight?: number
}) {
  return (
    <Typography className="flex-center" variant="caption" {...props}>
      {children}
      &nbsp;
      <Img
        alt={alt}
        maxHeight={imgMaxHeight}
        maxWidth={imgMaxWidth}
        src={src}
      />
    </Typography>
  )
}

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
}: {
  id: number
  form?: number
  evolution?: number
  gender?: number
  costume?: number
  alignment?: number
  shiny?: boolean
  bread?: number
} & Omit<Props, 'id'>) => {
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
