import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import Select, { SelectProps } from '@mui/material/Select'
import { SxProps } from '@mui/material'

const SX: SxProps = { margin: '3px 0' }

type ExtraProps = {
  fcSx?: SxProps
  setWidth?: (width: number) => void
}

export function FCSelect<Value = unknown>({
  children,
  value,
  label,
  size = 'small',
  setWidth,
  fullWidth = true,
  ...props
}: SelectProps<Value> & ExtraProps) {
  return (
    <FormControl size={size} fullWidth={fullWidth} sx={SX}>
      <InputLabel>{label}</InputLabel>
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

export function FCSelectListItem<Value extends unknown>({
  icon,
  ...props
}: SelectProps<Value> & ExtraProps & { icon?: React.ReactElement }) {
  return (
    <ListItem dense>
      {icon && <ListItemIcon>{icon}</ListItemIcon>}
      <FCSelect {...props} />
    </ListItem>
  )
}
