import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import IconButton from '@mui/material/IconButton'

export function VisibleToggle({
  visible,
  ...props
}: { visible?: boolean } & import('@mui/material').IconButtonProps) {
  return (
    <IconButton {...props}>
      {visible ? <Visibility /> : <VisibilityOff />}
    </IconButton>
  )
}
