// @ts-check

import { useEffect } from 'react'

/**
 * Stops the locate control from following when the map is programmatically flown.
 * @param {import('leaflet').Map} map
 * @param {(import('leaflet.locatecontrol').LocateControl & { _event?: { latlng: import('leaflet').LatLng } }) | null} lc
 */
export function useStopFollowingOnFly(map, lc) {
  useEffect(() => {
    if (!map || !lc) return undefined

    const handleMove = (event) => {
      if (event?.flyTo && lc._active && lc._event && lc.stopFollowing) {
        lc.stopFollowing()
      }
    }

    map.on('move', handleMove)

    return () => {
      map.off('move', handleMove)
    }
  }, [map, lc])
}
