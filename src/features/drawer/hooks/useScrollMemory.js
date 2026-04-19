// @ts-check
import * as React from 'react'

/** @type {Map<string, import('react-virtuoso').GridStateSnapshot>} */
const gridStateMemory = new Map()

/** @type {Map<string, number>} */
const scrollTopMemory = new Map()

/**
 * @param {string} key
 * @returns {import('react-virtuoso').GridStateSnapshot | null}
 */
export function getDrawerGridState(key) {
  return gridStateMemory.get(key) || null
}

/**
 * @param {string} key
 * @param {import('react-virtuoso').GridStateSnapshot} state
 */
export function setDrawerGridState(key, state) {
  gridStateMemory.set(key, state)
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
