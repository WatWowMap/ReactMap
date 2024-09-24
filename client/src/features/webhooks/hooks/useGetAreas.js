// @ts-check
import { useQuery } from '@apollo/client'

import { WEBHOOK_AREAS } from '@services/queries/webhook'

/**
 * @returns {{ data: { group: string, children: string[] }[], loading: boolean }}
 */
export function useGetAreas() {
  const { data, loading } = useQuery(WEBHOOK_AREAS, {
    fetchPolicy: 'cache-first',
  })

  return { data: data?.webhookAreas || [], loading }
}
