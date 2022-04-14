import React from 'react'
import { ButtonGroup, Button } from '@material-ui/core'
import { useTranslation } from 'react-i18next'

export default function Size({ filterValues, handleChange, btnSize }) {
  const sizes = ['sm', 'md', 'lg', 'xl']
  const { t } = useTranslation()

  return (
    <ButtonGroup>
      {sizes.map(size => {
        const color = (filterValues.size || 'md') === size ? 'primary' : 'secondary'
        return (
          <Button
            key={size}
            onClick={() => handleChange('size', size)}
            color={color}
            variant={(filterValues.size || 'md') === size ? 'contained' : 'outlined'}
            size={btnSize}
          >
            {t(size)}
          </Button>
        )
      })}
    </ButtonGroup>
  )
}
