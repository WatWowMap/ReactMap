// @ts-check
import * as React from 'react'

import { useMemory } from '@hooks/useMemory'
import { useStorage } from '@hooks/useStorage'

/**
 *
 * @param {Record<string, { name: string, style: 'light' | 'dark', attribution?: string, url?: string, background?: string }>} tileServers
 * @param {string} tileServer
 * @param {'day' | 'night' | 'dusk' | 'dawn'} timeOfDay
 * @returns
 */
const getTileLayer = (tileServers, tileServer, timeOfDay) => {
  const fallbackTs = Object.values(tileServers).find(
    (server) => server.name !== 'auto',
  )
  if (tileServers?.[tileServer]?.name === 'auto') {
    const autoTile =
      timeOfDay === 'night'
        ? Object.values(tileServers).find((server) => server.style === 'dark')
        : Object.values(tileServers).find((server) => server.style === 'light')
    return autoTile || fallbackTs
  }
  return tileServers[tileServer] || fallbackTs
}

export default function useTileLayer() {
  const timeOfDay = useMemory((s) => s.timeOfDay)
  const userTileLayer = useStorage((s) => s.settings.tileServers)
  const online = useMemory((s) => s.online)

  const tileLayer = React.useMemo(() => {
    const { config, settings } = useMemory.getState() || {
      minZoom: 10,
      maxZoom: 18,
    }
    const layer = getTileLayer(settings.tileServers, userTileLayer, timeOfDay)
    return {
      ...layer,
      style: layer.style || 'light',
      key: `${layer?.name}_${timeOfDay}}`,
      url:
        layer?.[timeOfDay] ||
        layer?.url ||
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png',
      minZoom: config.general.minZoom || 18,
      maxZoom: config.general.maxZoom || 10,
      zIndex: 250,
      attribution: online ? layer?.attribution : '',
    }
  }, [timeOfDay, userTileLayer, online])

  React.useEffect(() => {
    useMemory.setState({ tileStyle: tileLayer.style })
    const leafletContainerEl = document
      .getElementsByClassName('leaflet-container')
      .item(0)
    if (leafletContainerEl instanceof HTMLElement) {
      leafletContainerEl.style.background =
        tileLayer.background ??
        (tileLayer.style === 'dark' ? '#0F0D0D' : '#ddd')
    }
  }, [tileLayer.style])

  return tileLayer
}
