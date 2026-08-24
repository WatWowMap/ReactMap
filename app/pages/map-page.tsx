import { MapCanvas } from '@app/map/map-canvas'
import type { Camera } from '@app/map/use-map-libre'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

/**
 * Where the 1.0 map opened by default: roughly the middle of the North
 * Atlantic, a deliberately uninteresting fallback used only when the URL
 * carries no camera at all.
 */
const DEFAULT_CAMERA: Camera = { lat: 0, lon: 0, zoom: 2 }

function parseCamera(params: URLSearchParams): Camera {
  const lat = Number(params.get('lat'))
  const lon = Number(params.get('lon'))
  const zoom = Number(params.get('zoom'))
  return {
    lat: Number.isFinite(lat) && params.has('lat') ? lat : DEFAULT_CAMERA.lat,
    lon: Number.isFinite(lon) && params.has('lon') ? lon : DEFAULT_CAMERA.lon,
    zoom:
      Number.isFinite(zoom) && params.has('zoom') ? zoom : DEFAULT_CAMERA.zoom,
  }
}

/**
 * `lat`/`lon`/`zoom` query params are the camera's URL representation.
 * `useMapLibre` only reads `initialCamera` once (see its own comment), so
 * changes made here after mount do not fight the map; they exist so a
 * refresh, share, or back navigation lands on the same view, and are
 * written with `replace: true` so panning does not grow history one entry
 * per gesture.
 */
export function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialCamera = useMemo(() => parseCamera(searchParams), [])

  const handleCameraChange = useCallback(
    (camera: Camera) => {
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
