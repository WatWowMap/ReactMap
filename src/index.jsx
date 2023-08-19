// @ts-check
import * as React from 'react'
import { createRoot } from 'react-dom/client'
import ReactGA from 'react-ga4'
import { log } from '@rm/logger'

// Sentry must be imported before app
import './services/Sentry'
import App from './components/App'
import './services/i18n'

if (CONFIG.analytics.googleAnalyticsId) {
  ReactGA.initialize(CONFIG.analytics.googleAnalyticsId)
}
if (CONFIG.map.general.title) {
  document.title = CONFIG.map.general.title
}
log.info('ReactMap Version:', process.env.VERSION)

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
