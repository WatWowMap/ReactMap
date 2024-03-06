// @ts-check
import * as React from 'react'

import { Notification } from '@components/Notification'
import { resetAlert, useWebhookStore } from '@store/useWebhookStore'

export function WebhookNotification() {
  const webhookAlert = useWebhookStore((s) => s.alert)
  return (
    <Notification
      open={!!webhookAlert.open}
      cb={resetAlert}
      severity={webhookAlert.severity}
    >
      {webhookAlert.message}
    </Notification>
  )
}
