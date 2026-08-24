import 'maplibre-gl/dist/maplibre-gl.css'

import type { Camera } from './useMapLibre'
import { useMapLibre } from './useMapLibre'

export interface MapCanvasProps {
  initialCamera: Camera
  onCameraChange?: (camera: Camera) => void
}

/**
 * Mounts one MapLibre instance sized to the viewport minus the bottom nav
 * (`Shell` reserves that with `pb-16`, 4rem, so this container claims the
 * rest of the dynamic viewport height rather than the full 100dvh, or the
 * map would render 4rem taller than what is actually visible above the
 * nav).
 *
 * The stylesheet import above is load-bearing: without it the canvas still
 * renders, which is exactly what makes it easy to miss, but the
 * NavigationControl and attribution end up unstyled and mispositioned.
 */
export function MapCanvas({ initialCamera, onCameraChange }: MapCanvasProps) {
  const { containerRef } = useMapLibre({
    initialCamera,
    ...(onCameraChange ? { onCameraChange } : {}),
  })

  return (
    <div
      ref={containerRef}
      className="h-[calc(100dvh-4rem)] w-full"
      role="application"
      aria-label="Map"
    />
  )
}
