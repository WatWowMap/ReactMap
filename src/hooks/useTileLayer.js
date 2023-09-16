import * as React from 'react'

import { useStatic, useStore } from '@hooks/useStore'

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
  const timeOfDay = useStatic((state) => state.timeOfDay)
  const userTileLayer = useStore((state) => state.settings.tileServers)

  const tileLayer = React.useMemo(() => {
    const { config, settings } = useStatic.getState() || {
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
    }
  }, [timeOfDay, userTileLayer])

  React.useEffect(() => {
    useStatic.setState({ tileStyle: tileLayer.style })
  }, [tileLayer.style])

  return tileLayer
}
