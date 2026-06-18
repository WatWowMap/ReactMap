// @ts-check
import { useEffect } from 'react'

import { setLongTimeout } from '@utils/setLongTimeout'

/**
 *
 * @param {number} itemExpire
 * @param {import('leaflet').Marker<any>} ref
 * @param {() => void} [callback]
 */
export function useMarkerTimer(itemExpire, ref, callback) {
  useEffect(() => {
    if (!Number.isFinite(itemExpire) || itemExpire <= Date.now() / 1000) {
      return undefined
    }

    return setLongTimeout(
      () => {
        if (callback) {
          callback()
        } else if (ref) {
          ref.remove()
        }
      },
      (itemExpire - Date.now() / 1000) * 1000,
    )
  }, [callback, itemExpire, ref])
}
