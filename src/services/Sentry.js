// @ts-check
import { init, BrowserTracing } from '@sentry/react'
import Fetch from './Fetch'

if (CONFIG.client.sentry.dsn) {
  init({
    dsn:
      CONFIG.client.sentry.dsn ||
      'https://c40dad799323428f83aee04391639345@o1096501.ingest.sentry.io/6117162',
    integrations: [
      new BrowserTracing({
        tracePropagationTargets: ['localhost', /^\//, 'graphql'],
        idleTimeout: 10000,
      }),
    ],
    tracesSampleRate: CONFIG.client.sentry.tracesSampleRate
      ? +CONFIG.client.sentry.tracesSampleRate
      : 0.1,
    release: CONFIG.client.version,
    environment:
      process.env.NODE_ENV === 'development' ? 'development' : 'production',
    debug: CONFIG.client.sentry.debug || false,
    beforeSend: async (event) => {
      const errors = event.exception.values
      const isLibrary = errors.find((e) => e?.value?.includes('vendor'))
      const fetchError = errors.find((e) => e?.value?.includes('<'))

      if (!isLibrary) {
        const error = errors[0]
          ? `${errors[0].type}: ${errors[0].value}`
          : 'Unknown error'

        await Fetch.sendError(error)
      }
      return CONFIG.client.hasCustom || isLibrary || fetchError ? null : event
    },
  })
}
