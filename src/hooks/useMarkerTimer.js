// @ts-check
import { useEffect } from 'react'

/**
 *
 * @param {number} itemExpire
 * @param {import('leaflet').Marker<any>} ref
 * @param {() => void} [callback]
 */
export default function useMarkerTimer(itemExpire, ref, callback) {
  const ts = Math.floor(Date.now() / 1000)
  useEffect(() => {
    if (itemExpire > ts && itemExpire !== Infinity) {
      const timeout = setTimeout(() => {
        if (itemExpire) {
          if (callback) {
            callback()
          } else if (ref) {
            ref.remove()
          }
        }
      }, (itemExpire - ts) * 1000)
      return () => clearTimeout(timeout)
    }
  })
}
