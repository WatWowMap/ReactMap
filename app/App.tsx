import { createBrowserRouter, RouterProvider } from 'react-router'
import { ROUTES } from './routes'

const router = createBrowserRouter(ROUTES)

export function App() {
  return <RouterProvider router={router} />
}
