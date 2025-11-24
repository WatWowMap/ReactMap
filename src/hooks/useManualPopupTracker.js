// @ts-check
import { useCallback } from 'react'

import { useMemory } from '@store/useMemory'
import { normalizeCategory } from '@utils/normalizeCategory'

/**
 * Provide a stable handler that keeps manual popup tracking in sync with UI.
 *
 * @param {string} category
 * @param {string | number} id
 * @returns {() => void}
 */
export function useManualPopupTracker(category, id) {
  const normalizedCategory = normalizeCategory(category)
  return useCallback(() => {
    if (id === undefined || id === null || id === '') return
    const { manualParams } = useMemory.getState()
    const currentCategory = normalizeCategory(manualParams.category)
    if (manualParams.id === id && currentCategory === normalizedCategory) {
      return
    }
    useMemory.setState({
      manualParams: {
        category,
        id,
      },
    })
  }, [category, id, normalizedCategory])
}
