import * as React from 'react'
import TextField from '@mui/material/TextField'
import { useTranslation } from 'react-i18next'

import { useLocalesStore } from '../hooks/store'

export function EditLocale({
  name,
  type,
  ...props
}: { name: string } & import('@mui/material').TextFieldProps) {
  const { t } = useTranslation()
  const value = useLocalesStore((s) => s.custom[name] || '')

  const onChange: import('@mui/material').TextFieldProps['onChange'] =
    React.useCallback(
      (event) => {
        useLocalesStore.setState((prev) => ({
          custom: {
            ...prev.custom,
            [name]:
              type === 'number' ? +event.target.value || 0 : event.target.value,
          },
        }))
      },
      [name],
    )
  return (
    <TextField
      fullWidth
      type={type}
      value={value}
      onChange={onChange}
      multiline={type === 'text'}
      size="small"
      placeholder={t('enter_translation')}
      {...props}
    />
  )
}
