import React from 'react'
import { IconButton } from '@material-ui/core'
import { Check, Clear } from '@material-ui/icons'

export default function Enabled({ filters, setFilters, category }) {
  return (
    <IconButton onClick={() => {
      setFilters({
        ...filters,
        [category]: {
          ...filters[category],
          enabled: !filters[category].enabled,
        },
      })
    }}
    >
      {filters[category].enabled
        ? <Check style={{ fontSize: 15, color: '#00e676' }} />
        : <Clear style={{ fontSize: 15, color: 'red' }} />}
    </IconButton>
  )
}
