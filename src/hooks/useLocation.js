import { useState } from 'react'
import { LayerGroup, DomEvent, DomUtil, Control } from 'leaflet'
import { useTranslation } from 'react-i18next'
import { useMap } from 'react-leaflet'
import 'leaflet.locatecontrol'

/**
 * Use location hook
 * @returns {{ lc: any, color: import('@mui/material').ButtonProps['color'] }}
 */
export default function useLocation() {
  const map = useMap()
  const [color, setColor] = useState('inherit')
  const { t } = useTranslation()

  const [lc] = useState(() => {
    const LocateFab = Control.Locate.extend({
      _setClasses(state) {
        if (state === 'requesting') setColor('secondary')
        else if (state === 'active') setColor('success')
        else if (state === 'following') setColor('primary')
      },
      _cleanClasses() {
        setColor('inherit')
      },
      onAdd() {
        const container = DomUtil.create(
          'div',
          'react-locate-control leaflet-bar leaflet-control',
        )
        this._container = container
        this._map = map
        this._layer = this.options.layer || new LayerGroup()
        this._layer.addTo(map)
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
      options: {
        title: t('lc_title'),
        metersUnit: t('lc_metersUnit'),
        feetUnit: t('lc_feetUnit'),
        popup: t('lc_popup'),
        outsideMapBoundsMsg: t('lc_outsideMapBoundsMsg'),
        locateOptions: {
          maximumAge: 5000,
        },
      },
    }).addTo(map)
    return result
  })
  return { lc, color }
}
