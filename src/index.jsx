import * as React from 'react'
import { createRoot } from 'react-dom/client'
import ReactGA from 'react-ga4'

// Sentry must be imported before app
import './services/Sentry'
import App from './components/App'
import './services/i18n'

if (CONFIG.GOOGLE_ANALYTICS_ID) {
  ReactGA.initialize(CONFIG.GOOGLE_ANALYTICS_ID, {
    debug: !!CONFIG.ANALYTICS_DEBUG_MODE,
  })
}
if (CONFIG.TITLE) {
  document.title = CONFIG.TITLE
}
// eslint-disable-next-line no-console
console.log('ReactMap Version:', CONFIG.VERSION)

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
