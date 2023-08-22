import { useEffect } from 'react'

export default function useMarkerTimer(itemExpire, ref, callback) {
  const ts = Math.floor(Date.now() / 1000)
  useEffect(() => {
    if (itemExpire > ts && itemExpire !== Infinity) {
      const timeout = setTimeout(() => {
        if (itemExpire) {
          if (callback) {
            callback()
          } else if (ref?.current) {
            ref.current.remove()
          }
        }
      }, (itemExpire - ts) * 1000)
      return () => clearTimeout(timeout)
    }
  })
}
