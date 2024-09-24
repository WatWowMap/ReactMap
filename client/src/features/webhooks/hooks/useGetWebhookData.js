// @ts-check
import { useEffect, useMemo, useRef } from 'react'
import { useQuery } from '@apollo/client'
import { useTranslation } from 'react-i18next'

import { ALL_PROFILES, WEBHOOK_USER } from '@services/queries/webhook'
import { RobustTimeout } from '@services/apollo/RobustTimeout'
import { useWebhookStore } from '@store/useWebhookStore'

import { Poracle } from '../services/Poracle'

/**
 *
 * @template {import('@store/useWebhookStore').WebhookStore['category'] | 'profile'} T
 * @param {T} category
 * @returns {{ data: T extends 'human' ? { webhooks: string[], selected: string } : import("@rm/types").APIReturnType[T], loading: boolean }}
 */
export function useGetWebhookData(category) {
  const { t } = useTranslation()
  const search = useWebhookStore((s) => s.trackedSearch)
  const realCategory = useWebhookStore((s) => s.category)
  const timeout = useRef(new RobustTimeout(10_000))

  const { data, previousData, loading, refetch } = useQuery(ALL_PROFILES, {
    fetchPolicy: 'cache-and-network',
    variables: {
      category,
      status: 'GET',
    },
    context: {
      abortableContext: timeout.current,
    },
    skip: category !== realCategory && category !== 'profile',
  })
  const { data: userConfig } = useQuery(WEBHOOK_USER, {
    fetchPolicy: 'cache-and-network',
    skip: category !== 'human',
  })

  useEffect(() => {
    if (category === realCategory) {
      timeout.current.setupTimeout(refetch)
      return () => {
        timeout.current.off()
      }
    }
  }, [category, realCategory, refetch, timeout.current])

  const filtererData = useMemo(() => {
    const source = data ?? previousData
    return category === 'human' || category === 'profile'
      ? source?.webhook?.[category]
      : (source?.webhook?.[category] || []).filter(
          (x) =>
            !search ||
            (x.description
              ? x.description.toLowerCase().includes(search.toLowerCase())
              : Poracle.generateDescription(x, category)
                  .toLowerCase()
                  .includes(search)),
        ) || []
  }, [data, previousData, search])

  useEffect(() => {
    if (!loading && data?.webhook) {
      if (data.webhook.status === 'error') {
        const { context } = useWebhookStore.getState()
        useWebhookStore.setState({
          alert: {
            open: true,
            severity: data.webhook.status,
            message: t(data.webhook.message, { name: context.name || '' }),
          },
        })
      } else {
        useWebhookStore.setState({ [category]: filtererData })
      }
    }
  }, [data, filtererData, search])

  useEffect(() => {
    if (category === 'human') {
      useWebhookStore.setState({
        multipleHooks: userConfig?.webhookUser?.webhooks?.length > 1,
      })
    }
  }, [userConfig])

  return {
    data:
      category === 'human'
        ? userConfig?.webhookUser || { webhooks: [], selected: '' }
        : filtererData || [],
    loading,
  }
}
