// @ts-check
import * as React from 'react'
import { useQuery } from '@apollo/client'
import { useTranslation } from 'react-i18next'

import { ScanAreaTile } from '@features/scanArea'
import { WEBHOOK_GEOJSON } from '@services/queries/webhook'
import { Loading } from '@components/Loading'
import { useWebhookStore } from '@store/useWebhookStore'

const FALLBACK = {
  type: 'FeatureCollection',
  features: [],
}
export function WebhookAreaSelection() {
  const webhookMode = useWebhookStore((s) => s.mode)

  const { t } = useTranslation()
  const { data, loading, refetch } = useQuery(WEBHOOK_GEOJSON, {
    fetchPolicy: 'cache-first',
    skip: webhookMode !== 'areas',
  })

  React.useEffect(() => {
    if (webhookMode === 'areas') {
      refetch()
    }
  }, [webhookMode])

  if (loading) {
    return <Loading>{t('loading', { category: t('areas') })}</Loading>
  }
  if (webhookMode === 'areas' && data?.webhookGeojson) {
    return <ScanAreaTile {...(data.webhookGeojson || FALLBACK)} />
  }
  return null
}
