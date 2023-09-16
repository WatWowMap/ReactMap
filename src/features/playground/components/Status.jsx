// @ts-check
import * as React from 'react'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { useTranslation } from 'react-i18next'

import { handleReset, usePlayStore } from '../hooks/store'

/** @type {import('@mui/material').SnackbarProps['anchorOrigin']} */
const anchorOrigin = { vertical: 'bottom', horizontal: 'right' }

/** @type {React.CSSProperties} */
const alertStyle = { textAlign: 'center', color: 'white' }

export function StatusNotification() {
  const { t } = useTranslation()
  const loading = usePlayStore((s) => s.loading)
  const error = usePlayStore((s) => s.error)
  const success = usePlayStore((s) => s.success)

  const open = loading || !!error || !!success
  return (
    <Snackbar
      open={open}
      autoHideDuration={5000}
      onClose={handleReset}
      anchorOrigin={anchorOrigin}
    >
      <Alert
        severity={error ? 'error' : success ? 'success' : 'info'}
        variant="filled"
        style={alertStyle}
      >
        {error
          ? error.message || t('react_error')
          : success || `${t('loading', { category: '' })}...`}
      </Alert>
    </Snackbar>
  )
}
