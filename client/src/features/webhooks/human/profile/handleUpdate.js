// @ts-check
import { useWebhookStore } from '@store/useWebhookStore'

/**
 * @param {{ data: { webhook: { profile: import("@rm/types").PoracleProfile[]} } }} params
 */
export function handleUpdate({ data }) {
  useWebhookStore.setState({
    profileLoading: null,
    profile: data.webhook.profile,
  })
}
