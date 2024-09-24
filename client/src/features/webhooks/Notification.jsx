// @ts-check
import * as React from 'react'

import { Notification } from '@components/Notification'
import { resetAlert, useWebhookStore } from '@store/useWebhookStore'

export function WebhookNotification() {
  const alert = useWebhookStore((s) => s.alert)
  return (
    <Notification open={!!alert.open} cb={resetAlert} severity={alert.severity}>
      {alert.message}
    </Notification>
  )
}
