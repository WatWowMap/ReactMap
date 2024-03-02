// @ts-check
import * as React from 'react'
import { useQuery } from '@apollo/client'
import { useTranslation } from 'react-i18next'

import { WEBHOOK_GEOJSON } from '@services/queries/webhook'
import { Loading } from '@components/general/Loading'
import MemoScanArea from '@components/tiles/ScanArea'

import { useWebhookStore } from '../../store'

const FALLBACK = {
  type: 'FeatureCollection',
  features: [],
}
export default function WebhookAreaSelection() {
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
    return <MemoScanArea {...(data?.webhookGeojson || FALLBACK)} />
  }
  return null
}
