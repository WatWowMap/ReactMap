// @ts-check
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import TextField, { TextFieldProps } from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import HighlightOffIcon from '@mui/icons-material/HighlightOff'
import { useDeepStore, UseStoragePaths } from '@store/useStorage'

type Props = {
  field?: UseStoragePaths
  value?: string
  setValue?: (value: string) => void
  label?: string
  disabled?: boolean
} & TextFieldProps

export const GenericSearch = React.forwardRef<HTMLDivElement, Props>(
  ({ field, label, disabled, value, setValue, ...props }, ref) => {
    const { t } = useTranslation()
    const [searchValue, setSearchValue] = field
      ? useDeepStore(field, '')
      : [value, setValue]

    const InputProps = React.useMemo(
      () => ({
        endAdornment: (
          <IconButton
            disabled={!searchValue}
            size="small"
            onClick={() => setSearchValue('')}
          >
            <HighlightOffIcon fontSize="small" />
          </IconButton>
        ),
      }),
      [!!searchValue, setSearchValue],
    )

    const onChange: TextFieldProps['onChange'] = React.useCallback(
      (e) => setSearchValue(e.target.value || ''),
      [setSearchValue],
    )

    return (
      <TextField
        ref={ref}
        fullWidth
        InputProps={InputProps}
        disabled={disabled}
        label={t(
          label ??
            `search_${field.split('.').pop().replace('QuickSelect', '')}`,
        )}
        size="small"
        value={searchValue}
        variant="outlined"
        onChange={onChange}
        {...props}
        autoComplete="off"
      />
    )
  },
)

GenericSearch.displayName = 'GenericSearch'

export const GenericSearchMemo = React.memo(
  GenericSearch,
  (prev, next) =>
    prev.disabled === next.disabled &&
    prev.field === next.field &&
    prev.label === next.label,
)
