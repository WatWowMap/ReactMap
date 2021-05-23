import React, { useState } from 'react'
import { TextField } from '@material-ui/core'
import Utility from '@services/Utility'

export default function StringFilter({ filterValues, setFilterValues }) {
  const [validation, setValidation] = useState({
    value: filterValues.adv,
    status: false,
    label: 'Custom',
    message: 'Overwrites All Filters',
  })

  const validationCheck = event => {
    let { value } = event.target
    if (Utility.checkAdvFilter(value)) {
      setValidation({
        label: 'Valid',
        value,
        status: false,
        message: 'Valid Stats Filter',
      })
    } else if (value === '') {
      setValidation({
        label: 'Custom',
        value,
        status: false,
        message: 'Overwrites All Filters',
      })
    } else {
      setValidation({
        label: 'Invalid!',
        value,
        status: true,
        message: 'Enter a Valid Filter',
      })
      value = ''
    }
    setFilterValues({ ...filterValues, adv: value })
  }

  return (
    <TextField
      name="adv"
      error={validation.status}
      label={validation.label}
      helperText={validation.message}
      value={validation.value}
      onChange={validationCheck}
      color={validation.status ? 'primary' : 'secondary'}
      fullWidth
      autoComplete="off"
    />
  )
}
