import { createBrowserRouter, RouterProvider } from 'react-router'
import { ROUTER_ROUTES } from './routes'

const router = createBrowserRouter(ROUTER_ROUTES)

export function App() {
  return <RouterProvider router={router} />
}
