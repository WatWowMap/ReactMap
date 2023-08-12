import React from 'react'

import MemoScanArea from '@components/tiles/ScanArea'
import { useMap } from 'react-leaflet'
import { useStore } from '@hooks/useStore'
import { setLocation, setSelectedAreas, useWebhookStore } from './store'

export default function WebhookAreaSelection() {
  const map = useMap()
  const selectedWebhook = useStore((s) => s.selectedWebhook)
  const webhookMode = useWebhookStore((s) => s.mode)
  const selectedAreas = useWebhookStore((s) => s.selectedAreas)
  const webhookData = useWebhookStore((s) => s.data)

  if (webhookData[selectedWebhook] && webhookMode === 'areas') {
    const lower = webhookData[selectedWebhook].available.map((a) =>
      a.toLowerCase(),
    )
    const filtered = {
      ...webhookData[selectedWebhook].areas,
      features: webhookData[selectedWebhook].areas.features.filter((feature) =>
        lower.includes(feature.properties.name.toLowerCase()),
      ),
    }
    return (
      <MemoScanArea
        map={map}
        item={filtered}
        webhookMode={webhookMode}
        setWebhookMode={setLocation}
        selectedAreas={selectedAreas}
        setSelectedAreas={setSelectedAreas}
      />
    )
  }
  return null
}
