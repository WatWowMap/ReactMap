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
