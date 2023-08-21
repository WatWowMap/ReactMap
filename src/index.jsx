// @ts-check
import * as React from 'react'
import { createRoot } from 'react-dom/client'
import ReactGA from 'react-ga4'

// Sentry must be imported before app
import './services/Sentry'
import App from './components/App'
import './services/i18n'

if (CONFIG.googleAnalyticsId) {
  ReactGA.initialize(CONFIG.googleAnalyticsId)
}
if (CONFIG.client.title) {
  document.title = CONFIG.client.title
}

// eslint-disable-next-line no-console
console.log('ReactMap Version:', CONFIG.client.version)

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
