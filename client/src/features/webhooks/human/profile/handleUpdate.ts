import { useWebhookStore } from '@store/useWebhookStore'

export function handleUpdate({
  data,
}: {
  data: { webhook: { profile: import('@rm/types').PoracleProfile[] } }
}) {
  useWebhookStore.setState({
    profileLoading: null,
    profile: data.webhook.profile,
  })
}
