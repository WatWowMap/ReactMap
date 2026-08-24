import type { RouteObject } from 'react-router'

/*
 * Every route is lazy so the bundler gives each one its own chunk. The map
 * route is the only one that will ever pull in MapLibre and deck.gl, and that
 * only holds if nothing here imports a page eagerly.
 */
export const ROUTES: RouteObject[] = [
  {
    path: '/',
    lazy: async () => ({ Component: (await import('./pages/Hub')).Hub }),
  },
  {
    path: '/map',
    lazy: async () => ({
      Component: (await import('./pages/MapPage')).MapPage,
    }),
  },
  {
    path: '/filters',
    lazy: async () => ({
      Component: (await import('./pages/FiltersPage')).FiltersPage,
    }),
  },
  {
    path: '/alerts',
    lazy: async () => ({
      Component: (await import('./pages/AlertsPage')).AlertsPage,
    }),
  },
  {
    path: '/profile',
    lazy: async () => ({
      Component: (await import('./pages/Profile')).Profile,
    }),
  },
  {
    path: '/locales',
    lazy: async () => ({
      Component: (await import('./pages/Locales')).Locales,
    }),
  },
  {
    path: '/playground',
    lazy: async () => ({
      Component: (await import('./pages/Playground')).Playground,
    }),
  },
  {
    path: '*',
    lazy: async () => ({
      Component: (await import('./pages/NotFound')).NotFound,
    }),
  },
]
