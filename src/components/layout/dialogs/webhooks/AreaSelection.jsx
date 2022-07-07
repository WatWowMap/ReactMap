import React from 'react'

import MemoScanArea from '@components/tiles/ScanArea'

export default function AreaSelection({
  map,
  selectedWebhook,
  webhookMode,
  setWebhookMode,
  selectedAreas,
  setSelectedAreas,
  webhookData,
}) {
  if (webhookData[selectedWebhook]) {
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
        setWebhookMode={setWebhookMode}
        selectedAreas={selectedAreas}
        setSelectedAreas={setSelectedAreas}
      />
    )
  }
  return null
}
