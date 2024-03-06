// @ts-check
import { useEffect } from 'react'
import { useQuery } from '@apollo/client'

import { WEBHOOK_CATEGORIES, WEBHOOK_CONTEXT } from '@services/queries/webhook'

import { useWebhookStore } from '@store/useWebhookStore'

/** @returns {import('@store/useWebhookStore').WebhookStore['category'][]} */
export function useGetHookContext() {
  const mode = useWebhookStore((s) => s.mode)

  const { data: context } = useQuery(WEBHOOK_CONTEXT, {
    fetchPolicy: 'no-cache',
    skip: !mode,
  })
  const { data: categories } = useQuery(WEBHOOK_CATEGORIES, {
    fetchPolicy: 'no-cache',
    skip: !mode,
  })

  useEffect(() => {
    if (context?.webhookContext) {
      useWebhookStore.setState({
        context: context.webhookContext,
      })
    }
  }, [context])

  return categories?.webhookCategories || []
}
