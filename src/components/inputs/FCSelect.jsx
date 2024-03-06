// @ts-check
import * as React from 'react'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import Select from '@mui/material/Select'

/** @type {import('@mui/material').SxProps} */
const SX = { margin: '3px 0' }

/**
 * @typedef {import('@mui/material').SelectProps & { variant?: import('@mui/material').FormControlProps['variant'], fcSx?: import('@mui/material').SxProps }} FCSelectProps
 * @typedef {FCSelectProps & { icon?: React.ReactElement }} FCSelectListItemProps
 */

/** @type {React.ForwardRefExoticComponent<FCSelectProps>} */
export const FCSelect = React.forwardRef(
  (
    {
      children,
      value,
      label,
      size = 'small',
      fcSx = SX,
      fullWidth = true,
      ...props
    },
    ref,
  ) => (
    <FormControl size={size} fullWidth={fullWidth} sx={fcSx}>
      <InputLabel>{label}</InputLabel>
      <Select
        autoFocus
        ref={ref}
        value={value ?? ''}
        fullWidth={fullWidth}
        label={label}
        size={size}
        {...props}
      >
        {children}
      </Select>
    </FormControl>
  ),
)

/** @type {React.ForwardRefExoticComponent<FCSelectListItemProps>} */
export const FCSelectListItem = React.forwardRef(({ icon, ...props }, ref) => (
  <ListItem dense>
    {icon && <ListItemIcon>{icon}</ListItemIcon>}
    <FCSelect {...props} ref={ref} />
  </ListItem>
))
