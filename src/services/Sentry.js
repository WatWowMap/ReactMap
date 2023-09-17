// @ts-check
import { init, BrowserTracing } from '@sentry/react'

if (CONFIG.sentry.client.enabled) {
  init({
    dsn: CONFIG.sentry.client.dsn,
    integrations: [
      new BrowserTracing({
        tracePropagationTargets: ['localhost', /^\//, 'graphql'],
        idleTimeout: 10000,
      }),
    ],
    tracesSampleRate: CONFIG.sentry.client.tracesSampleRate
      ? +CONFIG.sentry.client.tracesSampleRate
      : 0.1,
    release: CONFIG.client.version,
    environment:
      process.env.NODE_ENV === 'development' ? 'development' : 'production',
    debug: CONFIG.sentry.client.debug || false,
    beforeSend: (event) => {
      const errors = event.exception.values
      const isLibrary = errors.find((e) => e?.value?.includes('vendor'))
      const fetchError = errors.find((e) => e?.value?.includes('<'))
      return CONFIG.client.hasCustom || isLibrary || fetchError ? null : event
    },
  })
}
