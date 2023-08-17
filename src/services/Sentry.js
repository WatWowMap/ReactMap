import { init, BrowserTracing } from '@sentry/react'
import Fetch from './Fetch'

if (CONFIG.SENTRY_DSN) {
  init({
    dsn:
      CONFIG.SENTRY_DSN ||
      'https://c40dad799323428f83aee04391639345@o1096501.ingest.sentry.io/6117162',
    integrations: [
      new BrowserTracing({
        tracePropagationTargets: ['localhost', /^\//, 'graphql'],
        idleTimeout: 10000,
      }),
    ],
    tracesSampleRate: CONFIG.SENTRY_TRACES_SAMPLE_RATE
      ? +CONFIG.SENTRY_TRACES_SAMPLE_RATE
      : 0.1,
    release: CONFIG.VERSION,
    environment:
      process.env.NODE_ENV === 'development' ? 'development' : 'production',
    debug: CONFIG.SENTRY_DEBUG,
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
      return CONFIG.CUSTOM || isLibrary || fetchError ? null : event
    },
  })
}
