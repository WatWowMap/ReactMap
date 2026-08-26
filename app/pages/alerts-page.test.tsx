import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, waitFor } from '@testing-library/react'
import type { AlertsClient } from '../alerts/alerts-query'
import { createRulesQueryClient } from '../rules/rules-query'
import { setupDom, teardownDom } from '../test-setup'
import { AlertsPage } from './alerts-page'

beforeAll(setupDom)
afterAll(teardownDom)
afterEach(cleanup)

// Not the global `screen`: it snapshots `document` at import time, before
// `setupDom` runs in `beforeAll`, and throws on every query as a result.
// Using the queries `render()` returns needs the DOM only once the test
// body runs -- `split-warning.test.tsx` and `species-picker.test.tsx` hit
// the same thing and sidestep it the same way.
function renderWith(client: AlertsClient) {
  return render(
    <QueryClientProvider client={createRulesQueryClient()}>
      <AlertsPage alertsClient={client} />
    </QueryClientProvider>,
  )
}

const EMPTY_SNAPSHOT = {
  human: {
    enabled: true,
    currentProfileNo: 1,
    latitude: null,
    longitude: null,
    areas: [],
  },
  alerts: [],
  profiles: [],
  locations: [],
}

test("renders one card per alert, described through Poracle's vocabulary", async () => {
  const { getByText } = renderWith({
    status: async () => ({ state: 'present' }),
    snapshot: async () => ({
      ...EMPTY_SNAPSHOT,
      alerts: [
        {
          uid: 7,
          pokemonId: 149,
          ivMin: 100,
          ivMax: 100,
          distance: 5000,
          clean: true,
        },
      ],
    }),
  } as unknown as AlertsClient)
  await waitFor(() => expect(getByText(/IV 100%/)).toBeTruthy())
  expect(getByText(/within 5 km/)).toBeTruthy()
})

test('an unreachable Poracle says so instead of showing an empty list', async () => {
  // 1.x rendered the full dialog with every button disabled and no
  // explanation. An empty list reads as "you have no alerts", which is a
  // different and wrong claim.
  const { getByText } = renderWith({
    status: async () => ({ state: 'unreachable' }),
    snapshot: async () => EMPTY_SNAPSHOT,
  } as unknown as AlertsClient)
  await waitFor(() =>
    expect(getByText(/unavailable|unreachable/i)).toBeTruthy(),
  )
})

test('no alerts and a working Poracle says the list is empty, not broken', async () => {
  const { getByText } = renderWith({
    status: async () => ({ state: 'present' }),
    snapshot: async () => EMPTY_SNAPSHOT,
  } as unknown as AlertsClient)
  await waitFor(() => expect(getByText(/no alerts yet/i)).toBeTruthy())
})

/**
 * `loading` and `absent`/`unconfigured` both render null, so `container`
 * reads empty from the first paint -- `waitFor` alone would pass before
 * `status` even resolved. Waiting on the call count, then giving the
 * settled promise's re-render a tick to commit, is what actually proves
 * the state was read rather than just never having rendered yet.
 */
async function flushStatus(calls: { count: number }) {
  await waitFor(() => expect(calls.count).toBeGreaterThan(0))
  await new Promise((resolve) => setTimeout(resolve, 50))
}

test('an absent human renders nothing', async () => {
  const calls = { count: 0 }
  const { container } = renderWith({
    status: async () => {
      calls.count += 1
      return { state: 'absent' }
    },
    snapshot: async () => EMPTY_SNAPSHOT,
  } as unknown as AlertsClient)
  await flushStatus(calls)
  expect(container.textContent).toBe('')
})

test('an unconfigured Poracle renders nothing', async () => {
  const calls = { count: 0 }
  const { container } = renderWith({
    status: async () => {
      calls.count += 1
      return { state: 'unconfigured' }
    },
    snapshot: async () => EMPTY_SNAPSHOT,
  } as unknown as AlertsClient)
  await flushStatus(calls)
  expect(container.textContent).toBe('')
})

// Removing the `loading` branch of the guard (leaving only
// `unconfigured`/`absent`) let every other test in this file keep
// passing, because a resolved status always lands there fast. A
// `status()` that never resolves is what actually proves loading itself
// renders nothing rather than falling through to "No alerts yet." before
// the real answer is known.
test('while loading, renders nothing rather than a premature empty-list message', () => {
  const { container } = renderWith({
    status: () => new Promise(() => {}),
    snapshot: async () => EMPTY_SNAPSHOT,
  } as unknown as AlertsClient)
  expect(container.textContent).toBe('')
})

// `alerts.status` rejects for a signed-out visitor and for a signed-in one
// the operator's role gating excludes -- the tab must fail closed to
// nothing rather than getting stuck on the loading branch forever.
test('a rejected status() renders nothing rather than getting stuck loading', async () => {
  const calls = { count: 0 }
  const { container } = renderWith({
    status: async () => {
      calls.count += 1
      throw new Error('UNAUTHORIZED')
    },
    snapshot: async () => EMPTY_SNAPSHOT,
  } as unknown as AlertsClient)
  await flushStatus(calls)
  expect(container.textContent).toBe('')
})
