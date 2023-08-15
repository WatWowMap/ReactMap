import React from 'react'

import MemoScanArea from '@components/tiles/ScanArea'
import { useQuery } from '@apollo/client'
import { WEBHOOK_GEOJSON } from '@services/queries/webhook'
import { setLocation, useWebhookStore } from '../../store'

export default function WebhookAreaSelection() {
  const webhookMode = useWebhookStore((s) => s.mode)
  const { data } = useQuery(WEBHOOK_GEOJSON, {
    fetchPolicy: 'cache-first',
    nextFetchPolicy: 'standby',
    skip: webhookMode !== 'areas',
  })

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
