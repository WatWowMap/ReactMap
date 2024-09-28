import Grid2 from '@mui/material/Unstable_Grid2'
import TextField from '@mui/material/TextField'
import { useMutation } from '@apollo/client'
import { useTranslation } from 'react-i18next'
import { useMemory } from '@store/useMemory'
import { Query } from '@services/queries'

export function ExtraUserFields() {
  const fields = useMemory((s) => s.extraUserFields)

  return fields?.length ? (
    <Grid2 container alignItems="center" justifyContent="center">
      {fields.map((field) => (
        <FieldValue
          key={typeof field === 'string' ? field : field.database}
          field={field}
        />
      ))}
    </Grid2>
  ) : null
}

export function FieldValue({
  field,
}: {
  field: import('@rm/types').ExtraField | string
}) {
  const { i18n } = useTranslation()
  const label =
    typeof field === 'string' ? field : field[i18n.language] || field.name
  const key = typeof field === 'string' ? field : field.database
  const disabled = typeof field === 'string' ? false : field.disabled

  const value = useMemory((s) => s.auth.data?.[key] || '')
  const [setField] = useMutation(Query.user('SET_EXTRA_FIELDS'))

  if (!key || !label) return null

  return (
    <Grid2 key={label} margin="10px 0" textAlign="center" xs={5}>
      <TextField
        disabled={disabled}
        label={label}
        value={value}
        variant="outlined"
        onChange={({ target }) => {
          useMemory.setState((prev) => ({
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
