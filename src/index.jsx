import React from 'react'
import { render } from 'react-dom'
import ReactGA from 'react-ga4'
import * as Sentry from '@sentry/react'
import { Integrations } from '@sentry/tracing'

import App from './components/App'
import './services/i18n'

if (inject) {
  const {
    GOOGLE_ANALYTICS_ID, ANALYTICS_DEBUG_MODE, TITLE, VERSION, CUSTOM,
    SENTRY_DSN, SENTRY_TRACES_SAMPLE_RATE, DEVELOPMENT, SENTRY_DEBUG,
  } = inject
  if (GOOGLE_ANALYTICS_ID) {
    ReactGA.initialize(GOOGLE_ANALYTICS_ID, { debug: ANALYTICS_DEBUG_MODE })
  }
  if (TITLE) {
    document.title = TITLE
  }
  Sentry.init({
    dsn: SENTRY_DSN || 'https://c40dad799323428f83aee04391639345@o1096501.ingest.sentry.io/6117162',
    integrations: [new Integrations.BrowserTracing()],
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE ? +SENTRY_TRACES_SAMPLE_RATE : 0.1,
    release: VERSION,
    environment: DEVELOPMENT ? 'development' : 'production',
    debug: SENTRY_DEBUG,
    beforeSend: async (event) => {
      const errors = event.exception.values
      const isLibrary = errors.find(e => e?.value?.includes('_'))
      const fetchError = errors.find(e => e?.value?.includes('<'))

      if (!isLibrary) {
        const error = errors[0] ? `${errors[0].type}: ${errors[0].value}` : 'Unknown error'
        await fetch('/clientError', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            version: VERSION,
          },
          body: JSON.stringify({ error }),
        })
      }
      return CUSTOM || isLibrary || fetchError ? null : event
    },
  })
  // eslint-disable-next-line no-console
  console.log('ReactMap Version:', VERSION)
}

document.addEventListener('DOMContentLoaded', () => {
  render(<App />, document.getElementById('root'))
})
