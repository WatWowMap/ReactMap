// @ts-check
import * as React from 'react'

import { useMemory } from '@store/useMemory'
import { NameTT } from '@components/popups/NameTT'
import { Img } from '@components/Img'

const DIMENSIONS = /** @type {const} */ ({
  small: 20,
  medium: 24,
  large: 35,
})

const STYLE = {
  imageRendering: 'crisp-edges',
}

/**
 * @param {{ id: number, size?: 'small' | 'medium' | 'large' }} props
 */
export function PokeType({ id, size = 'small' }) {
  const url = useMemory((s) => s.Icons.getTypes(id))

  return (
    <NameTT title={`poke_type_${id}`}>
      <Img
        src={url}
        maxHeight={DIMENSIONS[size]}
        maxWidth={DIMENSIONS[size]}
        sx={STYLE}
      />
    </NameTT>
  )
}
