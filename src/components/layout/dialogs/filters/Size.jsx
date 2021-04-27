import React from 'react'
import { ButtonGroup, Button } from '@material-ui/core'

import { useMasterfile } from '../../../../hooks/useStore'

export default function Size({ filterValues, handleChange }) {
  const { text: { sizes } } = useMasterfile(state => state.ui)

  return (
    <ButtonGroup>
      {sizes.map(size => {
        const color = filterValues.size === size ? 'primary' : 'secondary'
        return (
          <Button
            key={size}
            onClick={() => handleChange('size', size)}
            color={color}
          >
            {size}
          </Button>
        )
      })}
    </ButtonGroup>
  )
}
