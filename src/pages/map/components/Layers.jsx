// @ts-check
import * as React from 'react'
import { TileLayer, ZoomControl } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import { LocateControl } from '@turtlesocks/react-leaflet.locatecontrol'

import { useStorage } from '@store/useStorage'

import { useTileLayer } from '../hooks/useTileLayer'

export function ControlledTileLayer() {
  const layer = useTileLayer()
  return <TileLayer {...layer} />
}

export function ControlledZoomLayer() {
  const navSetting = useStorage(
    (s) => s.settings.navigationControls === 'leaflet',
  )
  return navSetting ? <ZoomControl position="bottomright" /> : null
}

export function ControlledLocate() {
  const { t } = useTranslation()
  const navSetting = useStorage(
    (s) => s.settings.navigationControls === 'leaflet',
  )
  const metric = useStorage((s) => s.settings.distanceUnit === 'kilometers')

  const strings = React.useMemo(
    () =>
      /** @type {import('@turtlesocks/react-leaflet.locatecontrol').LocateControlProps['strings']} */ ({
        metersUnit: t('lc_metersUnit'),
        feetUnit: t('lc_feetUnit'),
        popup: t('lc_popup'),
        outsideMapBoundsMsg: t('lc_outsideMapBoundsMsg'),
        title: t('lc_title'),
      }),
    [t],
  )
  return navSetting ? (
    <LocateControl
      position="bottomright"
      metric={metric}
      icon="fas fa-crosshairs"
      setView="untilPan"
      keepCurrentZoomLevel
      locateOptions={{ maximumAge: 5000 }}
      strings={strings}
    />
  ) : null
}
