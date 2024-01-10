// @ts-check
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import HighlightOffIcon from '@mui/icons-material/HighlightOff'

import { useDeepStore } from '@hooks/useStore'

/**
 * @typedef {{
 *  field?: import('@hooks/useStore').UseStorePaths,
 *  value?: string,
 *  setValue?: (value: string) => void,
 *  label?: string,
 *  disabled?: boolean,
 * } & import('@mui/material').TextFieldProps} Props
 */

/** @type {React.ForwardRefExoticComponent<Props>} */
export const GenericSearch = React.forwardRef(
  ({ field, label, disabled, value, setValue, ...props }, ref) => {
    const { t } = useTranslation()
    const [searchValue, setSearchValue] = field
      ? useDeepStore(field, '')
      : [value, setValue]

    const InputProps = React.useMemo(
      () => ({
        endAdornment: (
          <IconButton
            size="small"
            disabled={!searchValue}
            onClick={() => setSearchValue('')}
          >
            <HighlightOffIcon fontSize="small" />
          </IconButton>
        ),
      }),
      [!!searchValue, setSearchValue],
    )
    /** @type {import('@mui/material').TextFieldProps['onChange']} */
    const onChange = React.useCallback(
      (e) => setSearchValue(e.target.value || ''),
      [setSearchValue],
    )
    return (
      <TextField
        ref={ref}
        label={t(
          label ??
            `search_${field.split('.').pop().replace('QuickSelect', '')}`,
        )}
        variant="outlined"
        fullWidth
        size="small"
        disabled={disabled}
        value={searchValue}
        onChange={onChange}
        InputProps={InputProps}
        {...props}
        autoComplete="off"
      />
    )
  },
)

export const GenericSearchMemo = React.memo(
  GenericSearch,
  (prev, next) =>
    prev.disabled === next.disabled &&
    prev.field === next.field &&
    prev.label === next.label,
)
