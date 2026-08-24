// @ts-check
// TODO: Not sure if this is possible to actually type correctly with how the leaflet.locatecontrol library is written

import { useLocationError } from '@hooks/useLocationError'
import { useStopFollowingOnFly } from '@hooks/useStopFollowingOnFly'
import { useStorage } from '@store/useStorage'
import { RecoveringLocateControl } from '@utils/locateControl'
import { DomEvent, DomUtil, LayerGroup } from 'leaflet'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMap } from 'react-leaflet'

/**
 * Use location hook
 * @returns {{ lc: import('leaflet.locatecontrol').LocateControl & { _onClick: () => void, _active?: boolean }, requesting: boolean, color: import('@mui/material').ButtonProps['color'], locationError: { show: boolean, message: string }, hideLocationError: () => void }}
 */
export function useLocation(dependency = false) {
  const map = useMap()
  const [color, setColor] = useState(
    /** @type {import('@mui/material').ButtonProps['color']} */ ('secondary'),
  )
  const [requesting, setRequesting] = useState(false)
  const { t } = useTranslation()
  const metric = useStorage((s) => s.settings.distanceUnit === 'kilometers')
  const { locationError, hideLocationError, handleLocationError } =
    useLocationError()

  const lc = useMemo(() => {
    const LocateFab = RecoveringLocateControl.extend({
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
        // @ts-expect-error
        if (this._map) this._map.off('unload', this._unload, this)
      },
      stop() {
        // @ts-expect-error
        if (!this._map) return
        // @ts-expect-error
        this._deactivate()
        this._cleanClasses()
        // @ts-expect-error
        this._resetVariables()
        // @ts-expect-error
        this._removeMarker()
      },
      onAdd() {
        const container = DomUtil.create(
          'div',
          'react-locate-control leaflet-bar leaflet-control',
        )
        // @ts-expect-error
        this._container = container
        // @ts-expect-error
        this._layer = this.options.layer || new LayerGroup()
        // @ts-expect-error
        this._layer.addTo(this._map)
        // @ts-expect-error
        this._event = undefined
        // @ts-expect-error
        this._compassHeading = null
        // @ts-expect-error
        this._prevBounds = null

        // @ts-expect-error
        const linkAndIcon = this.options.createButtonCallback(
          container,
          // @ts-expect-error
          this.options,
        )
        // @ts-expect-error
        this._link = linkAndIcon.link
        // @ts-expect-error
        this._icon = linkAndIcon.icon

        DomEvent.on(
          // @ts-expect-error
          this._link,
          'click',
          function stuff(ev) {
            DomEvent.stopPropagation(ev)
            DomEvent.preventDefault(ev)
            this._onClick()
          },
          this,
          // @ts-expect-error
        ).on(this._link, 'dblclick', DomEvent.stopPropagation)

        // @ts-expect-error
        this._resetVariables()

        // @ts-expect-error
        this._map.on('unload', this._unload, this)

        return container
      },
    })

    const result = new LocateFab({
      // @ts-expect-error
      keepCurrentZoomLevel: true,
      setView: 'untilPan',
      metric,
      locateOptions: {
        maximumAge: 5000,
      },
      onLocationError: handleLocationError,
      strings: {
        metersUnit: t('lc_metersUnit'),
        feetUnit: t('lc_feetUnit'),
        popup: t('lc_popup'),
        outsideMapBoundsMsg: t('lc_outsideMapBoundsMsg'),
        title: t('lc_title'),
      },
    })
    return result
  }, [t, metric, handleLocationError])

  useStopFollowingOnFly(map, dependency ? lc : null)

  useEffect(() => {
    if (lc) {
      lc.addTo(map)
      return () => {
        lc.stop()
        lc.remove()
      }
    }
  }, [lc, map, dependency])

  // @ts-expect-error
  return { lc, requesting, color, locationError, hideLocationError }
}
