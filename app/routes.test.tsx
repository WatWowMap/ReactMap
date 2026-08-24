import { expect, test } from 'bun:test'
import { ROUTES } from './routes'

test('every spec route is present exactly once', () => {
  const paths = ROUTES.map((route) => route.path).sort()
  expect(paths).toEqual(
    [
      '*',
      '/',
      '/@/:lat/:lon',
      '/@/:lat/:lon/:zoom',
      '/alerts',
      '/filters',
      '/locales',
      '/map',
      '/playground',
      '/profile',
    ].sort(),
  )
})

/*
 * `/@/:lat/:lon(/:zoom)` are 1.0's deep links, kept for links already in
 * the wild. They redirect straight into `/map` and never mount MapLibre
 * themselves, so they carry no heavy dependency worth deferring; asserting
 * `lazy` on them would only prove they import `react-router`'s own
 * `Navigate`, which is already in every other chunk.
 */
const DEEP_LINK_PATHS = new Set(['/@/:lat/:lon', '/@/:lat/:lon/:zoom'])

test('every route that is not a deep-link redirect is lazy so it becomes its own chunk', () => {
  for (const route of ROUTES) {
    if (typeof route.path === 'string' && DEEP_LINK_PATHS.has(route.path)) {
      continue
    }
    expect(typeof route.lazy).toBe('function')
  }
})

test('deep-link routes redirect through a plain Component, not lazy', () => {
  for (const route of ROUTES) {
    if (typeof route.path === 'string' && DEEP_LINK_PATHS.has(route.path)) {
      expect(typeof route.Component).toBe('function')
    }
  }
})
