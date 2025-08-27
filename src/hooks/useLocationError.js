// @ts-check
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Shared hook for handling location errors with toast notifications
 * @returns {{ locationError: { show: boolean, message: string }, hideLocationError: () => void, handleLocationError: (err: any) => void }}
 */
export function useLocationError() {
  const [locationError, setLocationError] = useState({
    show: false,
    message: '',
  })
  const { t } = useTranslation()

  const hideLocationError = useCallback(() => {
    // Only hide the notification, keep the message for the animation
    setLocationError((prev) => ({ ...prev, show: false }))
  }, [])

  const handleLocationError = useCallback(
    (err) => {
      // Handle location errors with toast notifications
      let { message } = err

      if (!message)
        switch (err.code) {
          case 1: // PERMISSION_DENIED
            message = t('location_error_permission_denied')
            break
          case 2: // POSITION_UNAVAILABLE
            message = t('location_error_position_unavailable')
            break
          case 3: // TIMEOUT
            message = t('location_error_timeout')
            break
          default:
            message = t('location_error_default')
        }

      // Show toast notification instead of browser alert
      setLocationError({ show: true, message })
    },
    [t],
  )

  return { locationError, hideLocationError, handleLocationError }
}
