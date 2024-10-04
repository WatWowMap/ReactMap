import * as React from 'react'
import ListItem from '@mui/material/ListItem'
import TextField from '@mui/material/TextField'
import { useTranslation } from 'react-i18next'
import dlv from 'dlv'
import { useStorage } from '@store/useStorage'
import { setDeep } from '@utils/setDeep'
import { analytics } from '@utils/analytics'
import { checkIVFilterValid } from '@utils/checkAdvFilter'

export function StringFilter({
  field,
  ...props
}: { field: string } & import('@mui/material').ListItemProps) {
  const { t } = useTranslation()
  const value = useStorage((s) => dlv(s, `${field}.adv`))

  const [validation, setValidation] = React.useState({
    status: false,
    label: t('iv_or_filter'),
    message: t('overwrites'),
  })

  const validationCheck: import('@mui/material').TextFieldProps['onChange'] =
    React.useCallback(
      (event) => {
        try {
          const newValue = event.target.value

          analytics('Filtering', newValue, 'Legacy')
          if (checkIVFilterValid(newValue)) {
            setValidation({
              label: t('valid'),
              status: false,
              message: t('valid_filter'),
            })
          } else if (newValue === '') {
            setValidation({
              label: t('iv_or_filter'),
              status: false,
              message: t('overwrites'),
            })
          } else {
            setValidation({
              label: t('invalid'),
              status: true,
              message: t('invalid_filter'),
            })
          }
          useStorage.setState((prev) => setDeep(prev, `${field}.adv`, newValue))
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(err)
          if (err instanceof Error) {
            setValidation({
              label: t('invalid'),
              status: true,
              message: err.message,
            })
          }
        }
      },
      [field],
    )

  return (
    <ListItem {...props}>
      <TextField
        fullWidth
        autoComplete="off"
        color={validation.status ? 'primary' : 'secondary'}
        error={validation.status}
        helperText={validation.message}
        label={validation.label}
        value={value || ''}
        onChange={validationCheck}
      />
    </ListItem>
  )
}

export const StringFilterMemo = React.memo(StringFilter)
