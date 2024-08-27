// @ts-check
// TODO: Not sure if this is possible to actually type correctly with how the leaflet.locatecontrol library is written

import { useEffect, useMemo, useState } from 'react'
import { LayerGroup, DomEvent, DomUtil, Control } from 'leaflet'
import { useTranslation } from 'react-i18next'
import { useMap } from 'react-leaflet'
import 'leaflet.locatecontrol'

import { useStorage } from '@store/useStorage'

/**
 * Use location hook
 * @returns {{ lc: Control.Locate & { _onClick: () => void }, requesting: boolean, color: import('@mui/material').ButtonProps['color'] }}
 */
export function useLocation(dependency = false) {
  const map = useMap()
  const [color, setColor] = useState(
    /** @type {import('@mui/material').ButtonProps['color']} */ ('secondary'),
  )
  const [requesting, setRequesting] = useState(false)
  const { t } = useTranslation()
  const metric = useStorage((s) => s.settings.distanceUnit === 'kilometers')

  const lc = useMemo(() => {
    const LocateFab = Control.Locate.extend({
      _setClasses(state) {
        if (state === 'requesting') setColor('secondary')
        else if (state === 'active') setColor('success')
        else if (state === 'following') setColor('primary')
        setRequesting(state === 'requesting')
      },
      _cleanClasses() {
        setColor('secondary')
        setRequesting(false)
      },
      _unload() {
        this.stop()
        // @ts-ignore
        if (this._map) this._map.off('unload', this._unload, this)
      },
      stop() {
        // @ts-ignore
        if (!this._map) return
        // @ts-ignore
        this._deactivate()
        this._cleanClasses()
        // @ts-ignore
        this._resetVariables()
        // @ts-ignore
        this._removeMarker()
      },
      onAdd() {
        const container = DomUtil.create(
          'div',
          'react-locate-control leaflet-bar leaflet-control',
        )
        // @ts-ignore
        this._container = container
        // @ts-ignore
        this._layer = this.options.layer || new LayerGroup()
        // @ts-ignore
        this._layer.addTo(this._map)
        // @ts-ignore
        this._event = undefined
        // @ts-ignore
        this._compassHeading = null
        // @ts-ignore
        this._prevBounds = null

        // @ts-ignore
        const linkAndIcon = this.options.createButtonCallback(
          container,
          // @ts-ignore
          this.options,
        )
        // @ts-ignore
        this._link = linkAndIcon.link
        // @ts-ignore
        this._icon = linkAndIcon.icon

        DomEvent.on(
          // @ts-ignore
          this._link,
          'click',
          function stuff(ev) {
            DomEvent.stopPropagation(ev)
            DomEvent.preventDefault(ev)
            this._onClick()
          },
          this,
          // @ts-ignore
        ).on(this._link, 'dblclick', DomEvent.stopPropagation)

        // @ts-ignore
        this._resetVariables()

        // @ts-ignore
        this._map.on('unload', this._unload, this)

        return container
      },
    })
    const result = new LocateFab({
      // @ts-ignore
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
  }, [lc, map, dependency])

  // @ts-ignore
  return { lc, requesting, color }
}
