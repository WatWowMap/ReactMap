import { resolveInitialCamera, writeLastCamera } from '@app/map/last-camera'
import { MapCanvas } from '@app/map/map-canvas'
import type { Camera } from '@app/map/use-map-libre'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

/**
 * `lat`/`lon`/`zoom` query params are the camera's URL representation.
 * `useMapLibre` only reads `initialCamera` once (see its own comment), so
 * changes made here after mount do not fight the map; they exist so a
 * refresh, share, or back navigation lands on the same view, and are
 * written with `replace: true` so panning does not grow history one entry
 * per gesture.
 *
 * The URL alone is not enough, because the bottom nav's `<NavLink
 * to="/map">` is a bare path: coming back from Filters drops the query
 * string entirely. Every camera change is therefore also persisted to this
 * device (`last-camera.ts`), and `resolveInitialCamera` puts the URL ahead
 * of it, so a deep link still wins and a tab round trip still lands where
 * it left.
 */
export function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialCamera = useMemo(() => resolveInitialCamera(searchParams), [])

  const handleCameraChange = useCallback(
    (camera: Camera) => {
      writeLastCamera(camera)
      setSearchParams(
        {
          lat: camera.lat.toFixed(5),
          lon: camera.lon.toFixed(5),
          zoom: camera.zoom.toFixed(2),
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return (
    <MapCanvas
      initialCamera={initialCamera}
      onCameraChange={handleCameraChange}
    />
  )
}
