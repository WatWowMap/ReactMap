// @ts-check
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import ListItem from '@mui/material/ListItem'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import HighlightOffIcon from '@mui/icons-material/HighlightOff'

import { useDeepStore } from '@hooks/useStore'

/**
 * @param {{
 *  field: string,
 *  label?: string,
 *  disabled?: boolean,
 * }} props
 * @returns {JSX.Element}
 */
export function ItemSearch({ field, label = 'search', disabled }) {
  const { t } = useTranslation()
  const [value, setValue] = useDeepStore(field, '')

  const InputProps = React.useMemo(
    () => ({
      endAdornment: (
        <IconButton size="small" disabled={!value} onClick={() => setValue('')}>
          <HighlightOffIcon fontSize="small" />
        </IconButton>
      ),
    }),
    [value, setValue],
  )

  /** @type {import('@mui/material').TextFieldProps['onChange']} */
  const onChange = React.useCallback(
    (e) => setValue(e.target.value || ''),
    [setValue],
  )

  return (
    <ListItem>
      <TextField
        label={t(label)}
        variant="outlined"
        fullWidth
        size="small"
        disabled={disabled}
        value={value}
        onChange={onChange}
        InputProps={InputProps}
      />
    </ListItem>
  )
}

export const ItemSearchMemo = React.memo(
  ItemSearch,
  (prev, next) =>
    prev.disabled === next.disabled &&
    prev.field === next.field &&
    prev.label === next.label,
)
