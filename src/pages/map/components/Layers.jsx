// @ts-check
import * as React from 'react'
import { TileLayer, useMap } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const navSetting = useStorage(
    (s) => s.settings.navigationControls === 'leaflet',
  )
  const metric = useStorage((s) => s.settings.distanceUnit === 'kilometers')
  const map = useMap()

  const lc = React.useMemo(
    () =>
      control.locate({
        position: 'bottomright',
        metric,
        icon: 'fas fa-crosshairs',
        setView: 'untilPan',
        keepCurrentZoomLevel: true,
        locateOptions: { maximumAge: 5000 },
        strings: {
          metersUnit: t('lc_metersUnit'),
          feetUnit: t('lc_feetUnit'),
          popup: t('lc_popup'),
          outsideMapBoundsMsg: t('lc_outsideMapBoundsMsg'),
          title: t('lc_title'),
        },
      }),
    [metric, navSetting, t],
  )

  React.useEffect(() => {
    if (lc && navSetting) {
      lc.addTo(map)
      return () => {
        lc.stop()
        lc.remove()
      }
    }
  }, [lc, navSetting, map])

  return null
}
