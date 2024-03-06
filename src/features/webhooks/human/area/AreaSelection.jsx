// @ts-check
import * as React from 'react'
import { useQuery } from '@apollo/client'
import { useTranslation } from 'react-i18next'

import { ScanAreaTile } from '@features/scanArea'
import { WEBHOOK_GEOJSON } from '@services/queries/webhook'
import { Loading } from '@components/Loading'

import { useWebhookStore } from '@store/useWebhookStore'
import { handleClick } from './AreaChip'

const FALLBACK = {
  type: 'FeatureCollection',
  features: [],
}
export function WebhookAreaSelection() {
  const webhookMode = useWebhookStore((s) => s.mode)
  const webhookName = useWebhookStore((s) => s.context.name)

  const { t } = useTranslation()
  const { data, loading, refetch } = useQuery(WEBHOOK_GEOJSON, {
    fetchPolicy: 'cache-first',
    skip: webhookMode !== 'areas',
    variables: {
      webhookName,
    },
  })

  React.useEffect(() => {
    if (webhookMode === 'areas') {
      refetch()
    }
  }, [webhookName, webhookMode])

  if (loading) {
    return <Loading>{t('loading', { category: t('areas') })}</Loading>
  }
  if (webhookMode === 'areas' && data?.webhookGeojson) {
    return (
      <ScanAreaTile
        geojson={data.webhookGeojson || FALLBACK}
        handleClick={handleClick}
        webhook
      />
    )
  }
  return null
}
