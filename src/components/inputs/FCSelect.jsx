// @ts-check
import * as React from 'react'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import Select from '@mui/material/Select'

/** @type {React.CSSProperties} */
const STYLE = { margin: '3px 0' }

/**
 * @param {import('@mui/material').SelectProps} props
 * @returns
 */
export function FCSelect({ children, value, label, ...props }) {
  return (
    <FormControl size="small" fullWidth style={STYLE}>
      <InputLabel>{label}</InputLabel>
      <Select autoFocus value={value || ''} fullWidth label={label} {...props}>
        {children}
      </Select>
    </FormControl>
  )
}

/**
 * @param {{
 *  icon?: React.ReactNode
 * } & import('@mui/material').SelectProps} props
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
