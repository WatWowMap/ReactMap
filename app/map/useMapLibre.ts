import type { Layer, PickingInfo } from '@deck.gl/core'
import type { MapboxOverlayProps } from '@deck.gl/mapbox'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { Map as MapLibreMap, NavigationControl } from 'maplibre-gl'
import { type RefObject, useEffect, useRef, useState } from 'react'
import { resolveBasemapStyle } from './basemap'
import type { MapEntity, Viewport } from './types'

export interface Camera {
  lat: number
  lon: number
  zoom: number
}

/** A point to keep a popup anchored to, in map coordinates. */
export interface AnchorCoordinate {
  lat: number
  lon: number
}

/** Where `AnchorCoordinate` currently projects to, in container pixels. */
export interface ScreenPosition {
  x: number
  y: number
}

/**
 * Reads the entity a deck.gl click landed on, if any. Pulled out as a
 * plain function so the selection transition (miss clears, hit replaces)
 * is assertable without a WebGL context - `PickingInfo` is a plain object
 * this can be constructed by hand in a test; nothing here touches the map.
 */
export function pickedEntityFrom(info: PickingInfo): MapEntity | null {
  return (info.object as MapEntity | undefined) ?? null
}

/** The coordinate a selected entity's popup should stay anchored to. */
export function anchorFor(entity: MapEntity | null): AnchorCoordinate | null {
  return entity ? { lat: entity.lat, lon: entity.lon } : null
}

/**
 * Reads what a map currently frames. Typed against the accessors rather than
 * against `MapLibreMap` so a test can hand it a plain object: mounting a real
 * map needs a WebGL context this environment does not have, and the
 * bounds-to-`Bounds` mapping is exactly the kind of thing that is wrong by a
 * swapped field and renders without erroring.
 */
export function viewportFrom(map: {
  getBounds(): {
    getWest(): number
    getSouth(): number
    getEast(): number
    getNorth(): number
  }
  getZoom(): number
}): Viewport {
  const bounds = map.getBounds()
  return {
    bounds: {
      west: bounds.getWest(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      north: bounds.getNorth(),
    },
    zoom: map.getZoom(),
  }
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
  /**
   * Fired on every deck.gl click, picked or not (`info.object` is
   * `undefined` on a miss). The caller owns selection state; this hook
   * only reports what was under the cursor.
   */
  onPick?: (info: PickingInfo) => void
  /**
   * The coordinate the caller wants a popup anchored to, or `null` when
   * nothing is selected. Reprojected to container pixels on every camera
   * frame; see `screenPosition` below and task-5-report.md for why this
   * hook reprojects per frame rather than handing the coordinate to a
   * MapLibre `Marker`.
   */
  anchor?: AnchorCoordinate | null
  /**
   * Fired with what the camera frames, once when the map mounts and again on
   * every `moveend`. The caller feeds this straight back in as the area
   * `buildMapLayers` clusters and caps against; without it there is no
   * viewport, the clustering path never runs, and the whole of task 6 sits
   * inert behind green tests.
   *
   * This is a callback rather than a returned value because the caller's
   * `layers` are derived from it and are themselves an input to this hook.
   * Returning it would close that loop inside one render pass; handing the
   * caller the value to store breaks it, the same shape `onCameraChange`
   * already uses.
   *
   * Fires on `moveend`, not on `move`. Clustering a viewport is real work and
   * doing it once per animation frame through a pan would cost far more than
   * it buys: markers already move with the map during a gesture, so all that
   * is stale mid-gesture is the clustering granularity, and it settles the
   * moment the gesture does.
   */
  onViewportChange?: (viewport: Viewport) => void
}

export interface UseMapLibreResult {
  /** Attach to the element MapLibre should mount into. */
  containerRef: RefObject<HTMLDivElement | null>
  /**
   * `anchor` projected through the current camera, in pixels relative to
   * `containerRef`'s element. `null` when there is no anchor, or when the
   * map has not mounted yet.
   */
  screenPosition: ScreenPosition | null
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
export function buildOverlayProps(
  layers: Layer[],
  onClick?: (info: PickingInfo) => void,
): MapboxOverlayProps {
  return { interleaved: true, layers, ...(onClick ? { onClick } : {}) }
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
  onPick,
  anchor,
  onViewportChange,
}: UseMapLibreOptions): UseMapLibreResult {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const overlayRef = useRef<MapboxOverlay | null>(null)
  const onCameraChangeRef = useRef(onCameraChange)
  onCameraChangeRef.current = onCameraChange
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick
  const onViewportChangeRef = useRef(onViewportChange)
  onViewportChangeRef.current = onViewportChange
  // Read by the mount effect below, once, so the overlay starts with
  // whatever layers are already available instead of an empty frame while
  // waiting for the layers-sync effect to run.
  const initialLayersRef = useRef(layers)

  const [screenPosition, setScreenPosition] = useState<ScreenPosition | null>(
    null,
  )
  // Read by the 'move' handler on every frame, so the anchor coordinate is
  // always current without re-subscribing that handler on every render.
  const anchorRef = useRef(anchor)
  anchorRef.current = anchor

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
      buildOverlayProps(initialLayersRef.current ?? [], (info) =>
        onPickRef.current?.(info),
      ),
    )
    map.addControl(overlay)
    overlayRef.current = overlay

    const handleMoveEnd = () => {
      onViewportChangeRef.current?.(viewportFrom(map))
      const center = map.getCenter()
      onCameraChangeRef.current?.({
        lat: center.lat,
        lon: center.lng,
        zoom: map.getZoom(),
      })
    }
    map.on('moveend', handleMoveEnd)

    // Reprojects the popup's anchor coordinate on every camera frame, not
    // just on 'moveend'. A popup positioned only at gesture-end would
    // visibly detach from its entity and snap back into place once the
    // pan/zoom settled; 'move' fires continuously through the gesture and
    // the whole animation, which is what keeps it glued to the coordinate.
    // See task-5-report.md for why this reprojects instead of riding a
    // MapLibre `Marker`.
    const handleMove = () => {
      const current = anchorRef.current
      if (!current) {
        setScreenPosition(null)
        return
      }
      const point = map.project([current.lon, current.lat])
      setScreenPosition({ x: point.x, y: point.y })
    }
    map.on('move', handleMove)

    // Reported here rather than waiting for the first gesture, or the map
    // would spend its whole first view unclustered and uncapped.
    onViewportChangeRef.current?.(viewportFrom(map))

    mapRef.current = map
    return () => {
      map.off('moveend', handleMoveEnd)
      map.off('move', handleMove)
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

  // Projects immediately when the anchor itself changes (a new selection,
  // or a selection clearing), rather than waiting for the next 'move'
  // event, which may not come until the user next pans.
  useEffect(() => {
    const map = mapRef.current
    if (!anchor || !map) {
      setScreenPosition(null)
      return
    }
    const point = map.project([anchor.lon, anchor.lat])
    setScreenPosition({ x: point.x, y: point.y })
  }, [anchor])

  return { containerRef, screenPosition }
}
