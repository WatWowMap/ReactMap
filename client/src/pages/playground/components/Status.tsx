import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { useTranslation } from 'react-i18next'

import { handleReset, usePlayStore } from '../hooks/store'

const anchorOrigin: import('@mui/material').SnackbarProps['anchorOrigin'] = {
  vertical: 'bottom',
  horizontal: 'right',
}

const alertStyle: React.CSSProperties = { textAlign: 'center', color: 'white' }

export function StatusNotification() {
  const { t } = useTranslation()
  const loading = usePlayStore((s) => s.loading)
  const error = usePlayStore((s) => s.error)
  const success = usePlayStore((s) => s.success)

  const open = loading || !!error || !!success

  return (
    <Snackbar
      anchorOrigin={anchorOrigin}
      autoHideDuration={5000}
      open={open}
      onClose={handleReset}
    >
      <Alert
        severity={error ? 'error' : success ? 'success' : 'info'}
        style={alertStyle}
        variant="filled"
      >
        {error
          ? error.message || t('react_error')
          : success || `${t('loading', { category: '' })}...`}
      </Alert>
    </Snackbar>
  )
}
