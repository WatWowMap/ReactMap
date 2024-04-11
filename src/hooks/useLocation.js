import { useEffect, useMemo, useState } from 'react'
import { LayerGroup, DomEvent, DomUtil, Control } from 'leaflet'
import { useTranslation } from 'react-i18next'
import { useMap } from 'react-leaflet'
import 'leaflet.locatecontrol'

import { useStorage } from '@store/useStorage'

/**
 * Use location hook
 * @returns {{ lc: any, color: import('@mui/material').ButtonProps['color'] }}
 */
export function useLocation() {
  const map = useMap()
  const [color, setColor] = useState(
    /** @type {import('@mui/material').ButtonProps['color']} */ ('inherit'),
  )
  const { t } = useTranslation()
  const metric = useStorage((s) => s.settings.distanceUnit === 'kilometers')

  const lc = useMemo(() => {
    const LocateFab = Control.Locate.extend({
      _setClasses(state) {
        if (state === 'requesting') setColor('secondary')
        else if (state === 'active') setColor('success')
        else if (state === 'following') setColor('primary')
      },
      _cleanClasses() {
        setColor('inherit')
      },
      _unload() {
        this.stop()
        if (this._map) this._map.off('unload', this._unload, this)
      },
      stop() {
        if (!this._map) return
        this._deactivate()
        this._cleanClasses()
        this._resetVariables()
        this._removeMarker()
      },
      onAdd() {
        const container = DomUtil.create(
          'div',
          'react-locate-control leaflet-bar leaflet-control',
        )
        this._container = container
        this._layer = this.options.layer || new LayerGroup()
        this._layer.addTo(this._map)
        this._event = undefined
        this._compassHeading = null
        this._prevBounds = null

        const linkAndIcon = this.options.createButtonCallback(
          container,
          this.options,
        )
        this._link = linkAndIcon.link
        this._icon = linkAndIcon.icon

        DomEvent.on(
          this._link,
          'click',
          function stuff(ev) {
            DomEvent.stopPropagation(ev)
            DomEvent.preventDefault(ev)
            this._onClick()
          },
          this,
        ).on(this._link, 'dblclick', DomEvent.stopPropagation)

        this._resetVariables()

        this._map.on('unload', this._unload, this)

        return container
      },
    })
    const result = new LocateFab({
      keepCurrentZoomLevel: true,
      setView: 'untilPan',
      metric,
      locateOptions: {
        maximumAge: 5000,
      },
      strings: {
        metersUnit: t('lc_metersUnit'),
        feetUnit: t('lc_feetUnit'),
        popup: t('lc_popup'),
        outsideMapBoundsMsg: t('lc_outsideMapBoundsMsg'),
        title: t('lc_title'),
      },
    })
    return result
  }, [t, metric])

  useEffect(() => {
    if (lc) {
      lc.addTo(map)
      return () => {
        lc.stop()
        lc.remove()
      }
    }
  }, [lc, map])

  return { lc, color }
}
