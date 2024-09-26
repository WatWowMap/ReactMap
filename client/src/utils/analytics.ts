import ReactGA from 'react-ga4'

export function analytics(
  category: string,
  action: string = '',
  label: string = '',
  nonInteraction: boolean = false,
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
