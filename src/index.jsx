import React from 'react'
import { render } from 'react-dom'
import ReactGA from 'react-ga4'

// Sentry must be imported before app
import './services/Sentry'
import App from './components/App'
import './services/i18n'

if (inject) {
  const { GOOGLE_ANALYTICS_ID, ANALYTICS_DEBUG_MODE, TITLE, VERSION } = inject
  if (GOOGLE_ANALYTICS_ID) {
    ReactGA.initialize(GOOGLE_ANALYTICS_ID, { debug: ANALYTICS_DEBUG_MODE })
  }
  if (TITLE) {
    document.title = TITLE
  }
  // eslint-disable-next-line no-console
  console.log('ReactMap Version:', VERSION)
}

document.addEventListener('DOMContentLoaded', () => {
  render(<App />, document.getElementById('root'))
})
