import { expect, test } from 'bun:test'
import { ROUTES } from './routes'

test('every spec route is present exactly once', () => {
  const paths = ROUTES.map((route) => route.path).sort()
  expect(paths).toEqual(
    [
      '*',
      '/',
      '/alerts',
      '/filters',
      '/locales',
      '/map',
      '/playground',
      '/profile',
    ].sort(),
  )
})

test('every route element is lazy so it becomes its own chunk', () => {
  for (const route of ROUTES) {
    expect(typeof route.lazy).toBe('function')
  }
})
