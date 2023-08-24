// @ts-check
import * as React from 'react'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { useTranslation } from 'react-i18next'

import { handleReset, usePlayStore } from '../hooks/store'

/** @type {import('@mui/material').SnackbarProps['anchorOrigin']} */
const anchorOrigin = { vertical: 'bottom', horizontal: 'right' }

export function StatusNotification() {
  const { t } = useTranslation()
  const loading = usePlayStore((s) => s.loading)
  const error = usePlayStore((s) => s.error)
  const success = usePlayStore((s) => s.success)

  return (
    <Snackbar
      open={loading || !!error || success}
      autoHideDuration={5000}
      onClose={handleReset}
      anchorOrigin={anchorOrigin}
    >
      <Alert
        severity={error ? 'error' : success ? 'success' : 'info'}
        variant="filled"
      >
        {error
          ? error.message
          : success
          ? t('saved')
          : `${t('loading', { category: '' })}...`}
      </Alert>
    </Snackbar>
  )
}
