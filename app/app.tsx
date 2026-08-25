import { QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { ROUTER_ROUTES } from './routes'
import { createRulesQueryClient } from './rules/rules-query'

const router = createBrowserRouter(ROUTER_ROUTES)

// One client for the app's lifetime. `rules-query.ts` owns its defaults
// (no automatic retries -- see that file) so this and any test harness
// that builds its own agree without importing each other's instance.
const queryClient = createRulesQueryClient()

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
