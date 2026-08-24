import { useEffect } from 'react'

/**
 * Closes something when Escape is pressed, while it is open.
 *
 * This exists as its own hook rather than an effect inside MapCanvas so that it
 * can be tested. MapCanvas needs a real WebGL context to render at all, so
 * anything living inside it is only ever asserted, never exercised.
 *
 * Radix's Popover would have provided this for free, but its positioning tracks
 * an element's DOM rect through a ResizeObserver, and the map popup's anchor
 * moves by an inline style rewritten on every camera frame, which that does not
 * follow. Dismissal is independent of layout, so it does not get dropped along
 * with the layout engine.
 */
export function useDismissOnEscape(active: boolean, onDismiss: () => void) {
  useEffect(() => {
    if (!active) return undefined
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [active, onDismiss])
}
