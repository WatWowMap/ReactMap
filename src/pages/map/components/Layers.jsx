// @ts-check
import * as React from 'react'
import { TileLayer, useMap } from 'react-leaflet'
import { control } from 'leaflet'

import { useStorage } from '@store/useStorage'

import { useTileLayer } from '../hooks/useTileLayer'

export function ControlledTileLayer() {
  const layer = useTileLayer()
  return <TileLayer {...layer} />
}

export function ControlledZoomLayer() {
  const map = useMap()
  const navSetting = useStorage(
    (s) => s.settings.navigationControls === 'leaflet',
  )

  React.useLayoutEffect(() => {
    if (navSetting) {
      const zoom = control.zoom({ position: 'bottomright' }).addTo(map)
      return () => {
        zoom.remove()
      }
    }
  }, [navSetting, map])

  return null
}

export function ControlledLocate() {
  const map = useMap()
  const navSetting = useStorage(
    (s) => s.settings.navigationControls === 'leaflet',
  )

  const lc = React.useMemo(
    () =>
      control.locate({
        position: 'bottomright',
        icon: 'fas fa-crosshairs',
        keepCurrentZoomLevel: true,
        setView: 'untilPan',
      }),
    [],
  )

  React.useEffect(() => {
    if (navSetting) {
      lc.addTo(map)
      return () => {
        lc.remove()
      }
    }
  }, [navSetting, map, lc])

  return null
}
