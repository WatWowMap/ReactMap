import * as React from 'react'
import { createRoot } from 'react-dom/client'
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

createRoot(document.getElementById('root')).render(<App />)
