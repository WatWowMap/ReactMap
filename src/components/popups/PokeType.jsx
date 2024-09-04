// @ts-check
import * as React from 'react'
import Box from '@mui/material/Box'

import { useMemory } from '@store/useMemory'
import { NameTT } from '@components/popups/NameTT'

const DIMENSIONS = /** @type {const} */ ({
  small: 20,
  medium: 24,
  large: 35,
})

/**
 * @template {React.ElementType} [T=import('@mui/system').BoxTypeMap['defaultComponent']]
 * @param {{ id: number, size?: 'small' | 'medium' | 'large' } & Omit<import('@mui/material').BoxProps<T>, 'id'>} props
 */
export function PokeType({ id, size = 'small', ...props }) {
  const url = useMemory((s) => s.Icons.getTypes(id))

  return (
    <NameTT title={`poke_type_${id}`}>
      <Box
        height={DIMENSIONS[size]}
        width={DIMENSIONS[size]}
        sx={{
          background: `url(${url})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'contain',
        }}
        {...props}
      />
    </NameTT>
  )
}
