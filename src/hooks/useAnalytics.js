// @ts-check
import { useEffect } from 'react'

import { analytics } from '@utils/analytics'

/**
 *
 * @param {string} category
 * @param {string} action
 * @param {string} label
 * @param {boolean} nonInteraction
 */
export function useAnalytics(
  category,
  action = '',
  label = '',
  nonInteraction = false,
) {
  useEffect(() => {
    analytics(category, action, label, nonInteraction)
  }, [category, action, label, nonInteraction])
}
