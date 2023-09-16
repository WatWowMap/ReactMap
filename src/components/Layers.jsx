import * as React from 'react'
import { TileLayer, ZoomControl, useMap } from 'react-leaflet'
import { control } from 'leaflet'

import { useStore } from '@hooks/useStore'
import useTileLayer from '@hooks/useTileLayer'

export function ControlledTileLayer() {
  const layer = useTileLayer()
  return <TileLayer {...layer} />
}

export function ControlledZoomLayer() {
  const navSetting = useStore(
    (state) => state.settings.navigationControls === 'leaflet',
  )
  return navSetting ? <ZoomControl position="bottomright" /> : null
}

export function ControlledLocate() {
  const map = useMap()
  const navSetting = useStore(
    (state) => state.settings.navigationControls === 'leaflet',
  )

  React.useEffect(() => {
    if (navSetting) {
      const lc = control
        .locate({
          position: 'bottomright',
          icon: 'fas fa-crosshairs',
          keepCurrentZoomLevel: true,
          setView: 'untilPan',
        })
        .addTo(map)
      return () => lc.remove()
    }
  }, [navSetting])

  return null
}
