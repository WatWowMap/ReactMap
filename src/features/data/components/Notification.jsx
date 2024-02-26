import * as React from 'react'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { useDataManagementStore } from '../hooks/store'

const handleClose = (_, reason) => {
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
    <Snackbar open={open} autoHideDuration={5000} onClose={handleClose}>
      <Alert onClose={handleClose} severity={severity} variant="filled">
        {message}
      </Alert>
    </Snackbar>
  )
}
