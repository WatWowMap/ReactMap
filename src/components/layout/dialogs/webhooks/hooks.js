// @ts-check
import { useQuery } from '@apollo/client'
import { useStore } from '@hooks/useStore'
import { WEBHOOK_AREAS } from '@services/queries/webhook'

/**
 *
 * @returns {{ group: string, children: string[] }[]}
 */
export function useGetAreas() {
  const selectedWebhook = useStore((s) => s.selectedWebhook)
  const { data } = useQuery(WEBHOOK_AREAS, {
    variables: { name: selectedWebhook },
    fetchPolicy: 'cache-first',
  })

  return data?.webhookAreas || []
}
