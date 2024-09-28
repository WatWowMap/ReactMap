import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'

import { useDataManagementStore } from '../hooks/store'

const handleClose = (_: React.SyntheticEvent, reason?: string) => {
  if (reason === 'clickaway') {
    return
  }
  useDataManagementStore.setState({ notification: false })
}

export function DataManagementNotification() {
  const open = useDataManagementStore((s) => s.notification)
  const message = useDataManagementStore((s) => s.message)
  const severity = useDataManagementStore((s) => s.severity)

  return (
    <Snackbar autoHideDuration={5000} open={open} onClose={handleClose}>
      <Alert severity={severity} variant="filled" onClose={handleClose}>
        {message}
      </Alert>
    </Snackbar>
  )
}
