// @ts-check
import * as React from 'react'
import Grid2 from '@mui/material/Unstable_Grid2'
import TextField from '@mui/material/TextField'
import { useMutation } from '@apollo/client'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'
import { Query } from '@services/queries'

/** @param {{ refreshing?: boolean }} props */
export function ExtraUserFields({ refreshing = false } = {}) {
  const fields = useMemory((s) => s.extraUserFields)
  return fields?.length ? (
    <Grid2 container alignItems="center" justifyContent="center">
      {fields.map((field) => (
        <FieldValue
          key={typeof field === 'string' ? field : field.database}
          field={field}
          refreshing={refreshing}
        />
      ))}
    </Grid2>
  ) : null
}

/**
 * @param {{
 *   field: import('@rm/types').ExtraField | string,
 *   refreshing?: boolean,
 * }} props
 */
export function FieldValue({ field, refreshing = false }) {
  const { i18n } = useTranslation()
  const label =
    typeof field === 'string' ? field : field[i18n.language] || field.name
  const key = typeof field === 'string' ? field : field.database
  const disabled = typeof field === 'string' ? false : field.disabled

  const value = useMemory((s) => s.auth.data?.[key] || '')
  const [setField] = useMutation(Query.user('SET_EXTRA_FIELDS'))

  if (!key || !label) return null
  return (
    <Grid2 key={label} xs={5} textAlign="center" margin="10px 0">
      <TextField
        disabled={disabled || refreshing}
        variant="outlined"
        label={label}
        value={value}
        onChange={({ target }) => {
          const nextValue = target.value
          useMemory.setState((prev) => ({
            auth: {
              ...prev.auth,
              data: {
                ...prev.auth.data,
                [key]: nextValue,
              },
            },
          }))
          setField({
            variables: {
              key,
              value: nextValue,
            },
          })
        }}
      />
    </Grid2>
  )
}
