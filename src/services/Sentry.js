// @ts-check
import { browserTracingIntegration, init } from '@sentry/react'

if (CONFIG.sentry.client.enabled) {
  init({
    dsn: CONFIG.sentry.client.dsn,
    integrations: [
      browserTracingIntegration({
        idleTimeout: 10000,
      }),
    ],
    tracePropagationTargets: ['localhost', /^\//, 'graphql'],
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
