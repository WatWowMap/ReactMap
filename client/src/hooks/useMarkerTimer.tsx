import { useEffect } from 'react'

export function useMarkerTimer(
  itemExpire: number,
  ref: import('leaflet').Marker<any>,
  callback?: () => void,
) {
  const ts = Math.floor(Date.now() / 1000)

  useEffect(() => {
    if (itemExpire > ts && itemExpire !== Infinity) {
      const timeout = setTimeout(
        () => {
          if (itemExpire) {
            if (callback) {
              callback()
            } else if (ref) {
              ref.remove()
            }
          }
        },
        (itemExpire - ts) * 1000,
      )

      return () => clearTimeout(timeout)
    }
  })
}
