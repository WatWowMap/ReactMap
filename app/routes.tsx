import type { RouteObject } from 'react-router'
import { Shell } from './layout/shell'
import { DeepLink } from './pages/deep-link'

/*
 * Every route is lazy so the bundler gives each one its own chunk. The map
 * route is the only one that will ever pull in MapLibre and deck.gl, and that
 * only holds if nothing here imports a page eagerly.
 */
export const ROUTES: RouteObject[] = [
  {
    path: '/',
    lazy: async () => ({ Component: (await import('./pages/hub')).Hub }),
  },
  {
    path: '/map',
    lazy: async () => ({
      Component: (await import('./pages/map-page')).MapPage,
    }),
  },
  /*
   * 1.0's deep links, `/@/:lat/:lon` and `/@/:lat/:lon/:zoom`, are in the
   * wild. `DeepLink` is registered directly, not through `lazy()`: it has
   * no heavy dependency of its own, it only redirects into `/map`, and
   * that redirect is what actually triggers the lazy MapLibre load, on
   * the same terms as a visitor who navigated to `/map` directly.
   */
  {
    path: '/@/:lat/:lon',
    Component: DeepLink,
  },
  {
    path: '/@/:lat/:lon/:zoom',
    Component: DeepLink,
  },
  {
    path: '/filters',
    lazy: async () => ({
      Component: (await import('./pages/filters-page')).FiltersPage,
    }),
  },
  {
    path: '/alerts',
    lazy: async () => ({
      Component: (await import('./pages/alerts-page')).AlertsPage,
    }),
  },
  {
    path: '/profile',
    lazy: async () => ({
      Component: (await import('./pages/profile')).Profile,
    }),
  },
  {
    path: '/locales',
    lazy: async () => ({
      Component: (await import('./pages/locales')).Locales,
    }),
  },
  {
    path: '/playground',
    lazy: async () => ({
      Component: (await import('./pages/playground')).Playground,
    }),
  },
  {
    path: '*',
    lazy: async () => ({
      Component: (await import('./pages/not-found')).NotFound,
    }),
  },
]

/*
 * The route table `createBrowserRouter` actually consumes: ROUTES nested as
 * children of one layout route rendering Shell, which owns the bottom nav.
 * ROUTES itself stays flat because Task 1's test asserts against that shape.
 */
export const ROUTER_ROUTES: RouteObject[] = [
  {
    Component: Shell,
    children: ROUTES,
  },
]
