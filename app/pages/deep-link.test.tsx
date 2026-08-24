import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { cleanup, render } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { setupDom, teardownDom } from '../test-setup'
import { DeepLink } from './deep-link'

beforeAll(setupDom)
afterAll(teardownDom)
afterEach(cleanup)

function LocationProbe() {
  const location = useLocation()
  return (
    <span data-testid="location">
      {location.pathname}
      {location.search}
    </span>
  )
}

function renderAt(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/@/:lat/:lon" element={<DeepLink />} />
        <Route path="/@/:lat/:lon/:zoom" element={<DeepLink />} />
        <Route path="/map" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

test('a 1.0 lat/lon/zoom deep link redirects to /map with matching query params', () => {
  const { container } = renderAt('/@/40.7/-74.0/12')
  const location = container.querySelector('[data-testid="location"]')
  expect(location?.textContent).toBe('/map?lat=40.7&lon=-74.0&zoom=12')
})

test('a 1.0 lat/lon deep link without zoom redirects without a zoom param', () => {
  const { container } = renderAt('/@/40.7/-74.0')
  const location = container.querySelector('[data-testid="location"]')
  expect(location?.textContent).toBe('/map?lat=40.7&lon=-74.0')
})
