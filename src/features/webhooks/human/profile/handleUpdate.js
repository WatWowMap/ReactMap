// @ts-check
import { showWebhookError, useWebhookStore } from '@store/useWebhookStore'

/**
 * Applies a profile mutation result. A failed read has no list, so the
 * profiles on screen stay; an error is shown either way.
 * @param {{ data?: { webhook?: { status?: string, message?: string, profile?: import("@rm/types").PoracleProfile[] | null } } }} params
 */
export function handleUpdate({ data }) {
  const result = data?.webhook
  useWebhookStore.setState({
    profileLoading: null,
    ...(Array.isArray(result?.profile) && { profile: result.profile }),
  })
  if (result?.status === 'error') showWebhookError(result)
}
