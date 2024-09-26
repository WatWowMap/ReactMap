// @ts-check
import { useQuery } from '@apollo/client'

import { WEBHOOK_AREAS } from '@services/queries/webhook'

export function useGetAreas() {
  const { data, loading } = useQuery<{
    webhookAreas: { group: string; children: string[] }[]
  }>(WEBHOOK_AREAS, {
    fetchPolicy: 'cache-first',
  })

  return { data: data?.webhookAreas || [], loading }
}
