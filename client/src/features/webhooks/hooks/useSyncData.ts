import { useEffect } from 'react'
import { useQuery } from '@apollo/client'

import { ALL_PROFILES } from '@services/queries/webhook'
import { useWebhookStore } from '@store/useWebhookStore'

export function useSyncData<
  T extends import('@store/useWebhookStore').WebhookStore['category'],
>(category: T) {
  const cached = useWebhookStore((s) => s[category])

  const { data, loading } = useQuery(ALL_PROFILES, {
    fetchPolicy: 'no-cache',
    variables: {
      category,
      status: 'GET',
    },
  })

  useEffect(() => {
    if (data?.webhook?.[category]) {
      useWebhookStore.setState({
        [category]: data.webhook[category],
      })
    }
  }, [data])
  return { data: cached, loading }
}
