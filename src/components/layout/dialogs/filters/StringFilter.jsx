import React, { useState } from 'react'
import { TextField } from '@material-ui/core'
import { useTranslation } from 'react-i18next'
import Utility from '@services/Utility'

export default function StringFilter({ filterValues, setFilterValues }) {
  const { t } = useTranslation()
  const [validation, setValidation] = useState({
    value: filterValues.adv,
    status: false,
    label: t('custom'),
    message: t('overwrites'),
  })

  const validationCheck = event => {
    let { value } = event.target
    if (Utility.checkAdvFilter(value)) {
      setValidation({
        label: t('valid'),
        value,
        status: false,
        message: t('validFilter'),
      })
    } else if (value === '') {
      setValidation({
        label: t('custom'),
        value,
        status: false,
        message: t('overwrites'),
      })
    } else {
      setValidation({
        label: t('invalid'),
        value,
        status: true,
        message: t('invalidFilter'),
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
