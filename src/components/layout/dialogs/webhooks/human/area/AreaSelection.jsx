import * as React from 'react'
import { useQuery } from '@apollo/client'
import { useTranslation } from 'react-i18next'

import { WEBHOOK_GEOJSON } from '@services/queries/webhook'
import { Loading } from '@components/layout/general/Loading'
import MemoScanArea from '@components/tiles/ScanArea'

import { setLocation, useWebhookStore } from '../../store'

export default function WebhookAreaSelection() {
  const webhookMode = useWebhookStore((s) => s.mode)
  const { t } = useTranslation()
  const { data, loading } = useQuery(WEBHOOK_GEOJSON, {
    fetchPolicy: 'cache-first',
    nextFetchPolicy: 'standby',
    skip: webhookMode !== 'areas',
  })

  if (loading) {
    return <Loading>{t('loading', { category: 'areas' })}</Loading>
  }
  if (webhookMode === 'areas' && data?.webhookGeojson) {
    return (
      <MemoScanArea
        item={
          data?.webhookGeojson || { type: 'FeatureCollection', features: [] }
        }
        webhookMode={webhookMode}
        setWebhookMode={setLocation}
      />
    )
  }
  return null
}
