// @ts-check
import { useEffect } from 'react'
import ReactGA from 'react-ga4'

/**
 *
 * @param {string} category
 * @param {string} [action]
 * @param {string} [label]
 * @param {boolean} [nonInteraction]
 */
export function analytics(
  category,
  action = '',
  label = '',
  nonInteraction = false,
) {
  if (CONFIG.googleAnalyticsId) {
    if (action) {
      ReactGA.event({
        category,
        action,
        label,
        nonInteraction,
      })
    } else {
      ReactGA.pageview(category)
    }
  }
}

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
