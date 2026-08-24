import { type RefObject, useEffect, useRef, useState } from 'react'

export interface UseWebglContextRecoveryOptions {
  /**
   * Called once `webglcontextrestored` fires, before `restoring` clears.
   * This is where a caller re-warms whatever died with the old context -
   * MapCanvas clears the icon atlas and forces a fresh layer build here,
   * since the atlas's composited icons are gone along with the GPU
   * resources that held them.
   */
  onRestore: () => void
}

export interface UseWebglContextRecoveryResult {
  /** True from `webglcontextlost` until `webglcontextrestored` fires. */
  restoring: boolean
}

/**
 * Watches the canvas inside `containerRef` for WebGL context loss and
 * restoration, and tracks whether the map is currently in the gap between
 * them.
 *
 * `webglcontextlost` fires with the event's default action being "let the
 * context die for good" - calling `preventDefault()` on it is what tells
 * the browser recovery is wanted at all. Skipping that line is the classic
 * mistake here: the event still fires, `restoring` would still flip true,
 * and nothing would look wrong until `webglcontextrestored` never comes
 * and the map stays blank forever. This hook exists as its own module,
 * separate from MapCanvas, specifically so that line has one place to
 * live and one test that can fail if it goes missing.
 *
 * The canvas itself is looked up from `containerRef`'s DOM subtree rather
 * than threaded through as a prop, because `useMapLibre` owns the
 * MapLibre instance that creates it and does not (and should not) expose
 * the raw canvas element - `containerRef` is already public on its
 * result, and MapLibre places its canvas inside that container
 * synchronously when it mounts, before this hook's own effect runs.
 */
export function useWebglContextRecovery(
  containerRef: RefObject<HTMLElement | null>,
  { onRestore }: UseWebglContextRecoveryOptions,
): UseWebglContextRecoveryResult {
  const [restoring, setRestoring] = useState(false)
  const onRestoreRef = useRef(onRestore)
  onRestoreRef.current = onRestore

  useEffect(() => {
    const canvas = containerRef.current?.querySelector('canvas') ?? null
    if (!canvas) return undefined

    const handleContextLost = (event: Event) => {
      // Without this, the browser treats the loss as permanent and
      // webglcontextrestored never fires.
      event.preventDefault()
      setRestoring(true)
    }
    const handleContextRestored = () => {
      onRestoreRef.current()
      setRestoring(false)
    }

    canvas.addEventListener('webglcontextlost', handleContextLost)
    canvas.addEventListener('webglcontextrestored', handleContextRestored)
    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      canvas.removeEventListener('webglcontextrestored', handleContextRestored)
    }
  }, [containerRef])

  return { restoring }
}
