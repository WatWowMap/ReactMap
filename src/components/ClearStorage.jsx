// @ts-check
import * as React from 'react'
import { Navigate } from 'react-router-dom'

import { useMemory } from '@hooks/useMemory'
import { useStorage } from '@hooks/useStorage'

export default function ClearStorage() {
  localStorage.clear()
  sessionStorage.clear()

  React.useEffect(() => {
    useStorage.setState({
      filters: {},
      menus: {},
      location: [
        CONFIG.map.general.startLat || 0,
        CONFIG.map.general.startLon || 0,
      ],
      zoom: CONFIG.map.general.startZoom,
    })
    useMemory.setState({ Icons: null })
  }, [])
  return <Navigate to="/" />
}
