import { Map as MapLibreMap, NavigationControl } from 'maplibre-gl'
import { type RefObject, useEffect, useRef } from 'react'
import { resolveBasemapStyle } from './basemap'

export interface Camera {
  lat: number
  lon: number
  zoom: number
}

export interface UseMapLibreOptions {
  /** Camera to center on the moment the map is created. */
  initialCamera: Camera
  /**
   * Fired on `moveend`, i.e. once per pan/zoom gesture rather than once per
   * animation frame. The caller (`MapPage`) uses this to sync the URL
   * without pushing a history entry per frame; a listener that instead
   * pushed on `move` would make the back button useless after one pan.
   */
  onCameraChange?: (camera: Camera) => void
}

export interface UseMapLibreResult {
  /** Attach to the element MapLibre should mount into. */
  containerRef: RefObject<HTMLDivElement | null>
}

/**
 * Owns one MapLibre instance for the lifetime of the component that calls
 * this hook: creates it against `containerRef`'s element on mount, tears it
 * down on unmount, and re-centers it if `initialCamera` changes identity
 * (the deep-link redirect case, where the map is already mounted and a new
 * `/@/:lat/:lon/:zoom` link arrives at the same `/map` route).
 */
export function useMapLibre({
  initialCamera,
  onCameraChange,
}: UseMapLibreOptions): UseMapLibreResult {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const onCameraChangeRef = useRef(onCameraChange)
  onCameraChangeRef.current = onCameraChange

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    const map = new MapLibreMap({
      container,
      style: resolveBasemapStyle(),
      center: [initialCamera.lon, initialCamera.lat],
      zoom: initialCamera.zoom,
      attributionControl: { compact: true },
    })
    map.addControl(new NavigationControl(), 'top-right')

    const handleMoveEnd = () => {
      const center = map.getCenter()
      onCameraChangeRef.current?.({
        lat: center.lat,
        lon: center.lng,
        zoom: map.getZoom(),
      })
    }
    map.on('moveend', handleMoveEnd)

    mapRef.current = map
    return () => {
      map.off('moveend', handleMoveEnd)
      map.remove()
      mapRef.current = null
    }
    // Camera is only read once, to seed the map on creation; every camera
    // change after that flows through moveend and the caller's own state,
    // not back into this effect. Re-running this effect on every camera
    // change would tear down and recreate the whole map on every pan.
  }, [])

  return { containerRef }
}
