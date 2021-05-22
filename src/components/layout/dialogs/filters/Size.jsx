import React from 'react'
import { ButtonGroup, Button } from '@material-ui/core'

import { useStatic } from '../../../../hooks/useStore'

export default function Size({ filterValues, handleChange, btnSize }) {
  const { text: { sizes } } = useStatic(state => state.ui)

  return (
    <ButtonGroup>
      {sizes.map(size => {
        const color = filterValues.size === size ? 'primary' : 'secondary'
        return (
          <Button
            key={size}
            onClick={() => handleChange('size', size)}
            color={color}
            size={btnSize}
          >
            {size}
          </Button>
        )
      })}
    </ButtonGroup>
  )
}
