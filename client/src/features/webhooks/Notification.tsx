import { Notification } from '@components/Notification'
import { resetAlert, useWebhookStore } from '@store/useWebhookStore'

export function WebhookNotification() {
  const alert = useWebhookStore((s) => s.alert)

  return (
    <Notification cb={resetAlert} open={!!alert.open} severity={alert.severity}>
      {alert.message}
    </Notification>
  )
}
