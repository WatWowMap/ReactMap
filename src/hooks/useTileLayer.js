import * as React from 'react'

import { useStatic, useStore } from '@hooks/useStore'

const getTileServer = (tileServers, tileServer, timeOfDay) => {
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
  const { minZoom = 10, maxZoom = 18 } = useStatic.getState().config?.map || {}

  const tileServers = useStatic((s) => s.config?.tileServers)
  const timeOfDay = useStatic((state) => state.timeOfDay)
  const userTileLayer = useStore((state) => state.settings.tileServers)

  const tileServer = React.useMemo(
    () => getTileServer(tileServers, userTileLayer, timeOfDay),
    [timeOfDay, userTileLayer],
  )

  return {
    ...tileServer,
    key: tileServer?.name,
    url:
      tileServer?.[timeOfDay] ||
      tileServer?.url ||
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png',
    minZoom,
    maxZoom,
    zIndex: 250,
  }
}
