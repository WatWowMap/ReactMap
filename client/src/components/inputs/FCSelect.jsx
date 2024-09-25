// @ts-check
import * as React from 'react'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import Select from '@mui/material/Select'

const SX = /** @type {import('@mui/material').SxProps} */ ({ margin: '3px 0' })

/**
 * @template {unknown} T
 * @param {import('@rm/types').FCSelectProps<T>} props
 * @returns
 */
export function FCSelect({
  children,
  value,
  label,
  size = 'small',
  setWidth,
  fullWidth = true,
  ...props
}) {
  return (
    <FormControl size={size} fullWidth={fullWidth} sx={SX}>
      <InputLabel>{label}</InputLabel>
      {/* @ts-ignore */}
      <Select
        autoFocus
        ref={(ref) => {
          if (setWidth && ref instanceof HTMLDivElement) {
            setWidth(ref.clientWidth)
          }
        }}
        value={value ?? ''}
        fullWidth={fullWidth}
        label={label}
        size={size}
        {...props}
      >
        {children}
      </Select>
    </FormControl>
  )
}

/**
 * @template {unknown} T
 * @param {import('@rm/types').FCSelectListItemProps<T>} props
 * @returns
 */
export function FCSelectListItem({ icon, ...props }) {
  return (
    <ListItem dense>
      {icon && <ListItemIcon>{icon}</ListItemIcon>}
      <FCSelect {...props} />
    </ListItem>
  )
}
