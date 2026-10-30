// @ts-check
import * as React from 'react'

/** @type {Map<string, { state: import('react-virtuoso').GridStateSnapshot, count: number }>} */
const gridStateMemory = new Map()

/** @type {Map<string, number>} */
const scrollTopMemory = new Map()

/**
 * The grid's saved state, only while the list still has as many items as when it was saved: a snapshot of a
 * list that has since grown or shrunk (e.g. tappable rewards coming and going) restores to an empty window.
 * Dropping it also drops the saved scroll offset, which `useDrawerScrollMemory` would otherwise still restore,
 * so a changed list starts at the top. Call it before the scroller mounts
 * @param {string} key
 * @param {number} count
 * @returns {import('react-virtuoso').GridStateSnapshot | null}
 */
export function getDrawerGridState(key, count) {
  const saved = gridStateMemory.get(key)
  if (saved && saved.count === count) return saved.state
  if (saved) {
    gridStateMemory.delete(key)
    scrollTopMemory.delete(key)
  }
  return null
}

/**
 * @param {string} key
 * @param {import('react-virtuoso').GridStateSnapshot} state
 * @param {number} count
 */
export function setDrawerGridState(key, state, count) {
  gridStateMemory.set(key, { state, count })
}

/**
 * @template {HTMLElement} T
 * @param {string} key
 * @param {boolean} [restore]
 */
export function useDrawerScrollMemory(key, restore = true) {
  const nodeRef = React.useRef(/** @type {T | null} */ (null))
  const rafRef = React.useRef(0)

  const handleScroll = React.useCallback(() => {
    if (nodeRef.current) {
      scrollTopMemory.set(key, nodeRef.current.scrollTop)
    }
  }, [key])

  const restoreScrollTop = React.useCallback(
    /** @param {T | null} node */
    (node) => {
      if (!node || !restore) return
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current)
      }
      rafRef.current = window.requestAnimationFrame(() => {
        if (nodeRef.current === node) {
          node.scrollTop = scrollTopMemory.get(key) || 0
        }
      })
    },
    [key, restore],
  )

  const ref = React.useCallback(
    /** @type {React.RefCallback<T>} */ (
      (node) => {
        if (nodeRef.current) {
          nodeRef.current.removeEventListener('scroll', handleScroll)
        }
        nodeRef.current = node
        if (node) {
          node.addEventListener('scroll', handleScroll, { passive: true })
          restoreScrollTop(node)
        }
      }
    ),
    [handleScroll, restoreScrollTop],
  )

  React.useLayoutEffect(() => {
    restoreScrollTop(nodeRef.current)
  }, [restoreScrollTop])

  React.useEffect(
    () => () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current)
      }
      if (nodeRef.current) {
        nodeRef.current.removeEventListener('scroll', handleScroll)
      }
    },
    [handleScroll],
  )

  return { ref }
}
