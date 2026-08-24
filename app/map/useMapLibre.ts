import type { Layer } from '@deck.gl/core'
import type { MapboxOverlayProps } from '@deck.gl/mapbox'
import { MapboxOverlay } from '@deck.gl/mapbox'
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
  /**
   * deck.gl layers to render on top of the basemap, attached through a
   * `MapboxOverlay` created with `interleaved: true`. Interleaved is not
   * cosmetic: it is what places these layers beneath MapLibre's own street
   * label layer instead of painting over it, and it is the reason this
   * hook builds on MapLibre rather than deck.gl replacing it outright.
   * Updates flow through `overlay.setProps` on every change of this array,
   * independent of the mount effect below, so panning/zooming the camera
   * never tears down and rebuilds the overlay.
   */
  layers?: Layer[]
}

export interface UseMapLibreResult {
  /** Attach to the element MapLibre should mount into. */
  containerRef: RefObject<HTMLDivElement | null>
}

/**
 * Builds the props `MapboxOverlay` is constructed with. Pulled out as a
 * plain function, rather than inlined in the mount effect, so its one
 * load-bearing setting is assertable without a real WebGL context:
 * `interleaved: true` is what places these layers beneath MapLibre's own
 * street label layer instead of over it, and getting it wrong renders
 * without erroring, so a test asserting the props object is the only
 * automated guard against that regressing. Actual interleaving - markers
 * visually sitting under labels - still needs a browser; see
 * task-4-report.md.
 */
export function buildOverlayProps(layers: Layer[]): MapboxOverlayProps {
  return { interleaved: true, layers }
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
  layers,
}: UseMapLibreOptions): UseMapLibreResult {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const overlayRef = useRef<MapboxOverlay | null>(null)
  const onCameraChangeRef = useRef(onCameraChange)
  onCameraChangeRef.current = onCameraChange
  // Read by the mount effect below, once, so the overlay starts with
  // whatever layers are already available instead of an empty frame while
  // waiting for the layers-sync effect to run.
  const initialLayersRef = useRef(layers)

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

    const overlay = new MapboxOverlay(
      buildOverlayProps(initialLayersRef.current ?? []),
    )
    map.addControl(overlay)
    overlayRef.current = overlay

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
      // map.remove() tears down every control it holds, this overlay
      // included, so there is nothing extra to release here.
      map.remove()
      overlayRef.current = null
      mapRef.current = null
    }
    // Camera is only read once, to seed the map on creation; every camera
    // change after that flows through moveend and the caller's own state,
    // not back into this effect. Re-running this effect on every camera
    // change would tear down and recreate the whole map on every pan.
  }, [])

  useEffect(() => {
    overlayRef.current?.setProps({ layers: layers ?? [] })
  }, [layers])

  return { containerRef }
}
