import React from 'react'
import {
  Select, ButtonGroup, Button, MenuItem,
} from '@material-ui/core'

import { useMasterfile } from '../../../../hooks/useStore'

export default function Size({ isMobile, filterValues, handleChange }) {
  const { sizes } = useMasterfile(state => state.ui)

  return (
    <>
      {isMobile ? (
        <>
          <Select
            name="size"
            value={filterValues.size}
            onChange={handleChange}
            style={{ width: 60 }}
          >
            {sizes.map(size => (
              <MenuItem key={size} value={size}>{size}</MenuItem>
            ))}
          </Select>
        </>
      )
        : (
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
        )}
    </>
  )
}
