import { useEffect } from 'react'

export default function useMarkerTimer(
  itemExpire,
  itemId,
  ref,
  map,
  ts,
  callback,
) {
  useEffect(() => {
    if (itemExpire > ts && itemExpire !== Infinity) {
      const timeout = setTimeout(() => {
        if (itemExpire) {
          if (callback) {
            callback()
          } else if (ref?.current && ref?.current[itemId]) {
            ref.current[itemId].removeFrom(map)
          }
        }
      }, (itemExpire - ts) * 1000)
      return () => clearTimeout(timeout)
    }
  })
}
