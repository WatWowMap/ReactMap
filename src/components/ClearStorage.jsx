// @ts-check
import * as React from 'react'
import { Navigate } from 'react-router-dom'

import { useMemory } from '@hooks/useMemory'
import { useStorage } from '@hooks/useStorage'

export default function ClearStorage() {
  React.useEffect(() => {
    localStorage.clear()
    sessionStorage.clear()

    const { filters, menus } = useMemory.getState()
    useStorage.setState({
      filters: structuredClone(filters),
      menus: structuredClone(menus),
      location: [
        CONFIG.map.general.startLat || 0,
        CONFIG.map.general.startLon || 0,
      ],
      zoom: CONFIG.map.general.startZoom,
    })
    useMemory.setState({ Icons: null, Audio: null })
  }, [])

  return <Navigate to="/" />
}
