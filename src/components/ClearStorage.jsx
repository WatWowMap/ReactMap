// @ts-check
import { useStatic, useStore } from '@hooks/useStore'
import * as React from 'react'
import { Navigate } from 'react-router-dom'

export default function ClearStorage() {
  localStorage.clear()
  sessionStorage.clear()

  React.useEffect(() => {
    useStore.setState({
      filters: {},
      menus: {},
      location: [
        CONFIG.map.general.startLat || 0,
        CONFIG.map.general.startLon || 0,
      ],
      zoom: CONFIG.map.general.startZoom,
    })
    useStatic.setState({ Icons: null })
  }, [])
  return <Navigate to="/" />
}
