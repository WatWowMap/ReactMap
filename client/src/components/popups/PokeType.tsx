import * as React from 'react'

import { useMemory } from '@store/useMemory'
import { NameTT } from '@components/popups/NameTT'
import { Img } from '@components/Img'

const DIMENSIONS = {
  small: 20,
  medium: 24,
  large: 35,
} as const

const STYLE: React.CSSProperties = {
  imageRendering: 'crisp-edges',
}

export function PokeType({
  id,
  size = 'small',
}: {
  id: number
  size?: keyof typeof DIMENSIONS
}) {
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
