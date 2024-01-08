// @ts-check
import * as React from 'react'
import Grid2 from '@mui/material/Unstable_Grid2/Grid2'
import TextField from '@mui/material/TextField'
import { useMutation } from '@apollo/client'

import { useStatic } from '@hooks/useStore'
import Query from '@services/Query'
import { useTranslation } from 'react-i18next'

export function ExtraUserFields() {
  const extraUserFields = useStatic((s) => s.extraUserFields)
  return (
    <Grid2
      container
      alignItems="center"
      justifyContent="center"
      marginBottom={10}
    >
      {extraUserFields.map((field) => (
        <FieldValue
          key={typeof field === 'string' ? field : field.database}
          field={field}
        />
      ))}
    </Grid2>
  )
}

/** @param {{ field: import('@rm/types').ExtraField | string}} props */
export function FieldValue({ field }) {
  const { i18n } = useTranslation()
  const label =
    typeof field === 'string' ? field : field[i18n.language] || field.name
  const key = typeof field === 'string' ? field : field.database
  const disabled = typeof field === 'string' ? false : field.disabled

  const value = useStatic((s) => s.auth.data?.[key] || '')
  const [setField] = useMutation(Query.user('setExtraFields'))

  if (!key || !label) return null
  return (
    <Grid2 key={label} xs={5} textAlign="center" margin="10px 0">
      <TextField
        disabled={disabled}
        variant="outlined"
        label={label}
        value={value}
        onChange={({ target }) => {
          useStatic.setState((prev) => ({
            auth: {
              ...prev.auth,
              data: {
                ...prev.auth.data,
                [key]: target.value,
              },
            },
          }))
          setField({
            variables: {
              key,
              value,
            },
          })
        }}
      />
    </Grid2>
  )
}
