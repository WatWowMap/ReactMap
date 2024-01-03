// @ts-check
import * as React from 'react'
import ListItem from '@mui/material/ListItem'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import HighlightOffIcon from '@mui/icons-material/HighlightOff'
import { useTranslation } from 'react-i18next'
import dlv from 'dlv'

import { useStore } from '@hooks/useStore'
import { setDeep } from '@services/functions/setDeep'

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
  const value = useStore((s) => dlv(s, field))

  return (
    <ListItem>
      <TextField
        label={t(label)}
        variant="outlined"
        fullWidth
        size="small"
        disabled={disabled}
        value={value || ''}
        onChange={(e) =>
          useStore.setState((prev) =>
            setDeep(prev, field, e.target.value || ''),
          )
        }
        InputProps={{
          endAdornment: (
            <IconButton
              size="small"
              disabled={!value}
              onClick={() =>
                useStore.setState((prev) => setDeep(prev, field, ''))
              }
            >
              <HighlightOffIcon fontSize="small" />
            </IconButton>
          ),
        }}
      />
    </ListItem>
  )
}
