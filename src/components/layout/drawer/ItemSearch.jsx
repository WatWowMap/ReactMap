// @ts-check
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import HighlightOffIcon from '@mui/icons-material/HighlightOff'

import { useDeepStore } from '@hooks/useStore'

/**
 * @typedef {{
 *  field: import('@hooks/useStore').UseStorePaths,
 *  label?: string,
 *  disabled?: boolean,
 * } & import('@mui/material').TextFieldProps} Props
 */

/** @type {React.ForwardRefExoticComponent<Props>} */
export const GenericSearch = React.forwardRef(
  ({ field, label, disabled, ...props }, ref) => {
    const { t } = useTranslation()
    const [value, setValue] = useDeepStore(field, '')

    const InputProps = React.useMemo(
      () => ({
        endAdornment: (
          <IconButton
            size="small"
            disabled={!value}
            onClick={() => setValue('')}
          >
            <HighlightOffIcon fontSize="small" />
          </IconButton>
        ),
      }),
      [!!value, setValue],
    )
    /** @type {import('@mui/material').TextFieldProps['onChange']} */
    const onChange = React.useCallback(
      (e) => setValue(e.target.value || ''),
      [setValue],
    )
    return (
      <TextField
        ref={ref}
        label={t(label)}
        variant="outlined"
        fullWidth
        size="small"
        disabled={disabled}
        value={value}
        onChange={onChange}
        InputProps={InputProps}
        {...props}
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
