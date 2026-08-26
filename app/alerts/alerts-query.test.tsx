import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { createRulesQueryClient } from '../rules/rules-query'
import { setupDom, teardownDom } from '../test-setup'
import type { AlertsClient, AlertsSnapshot, AlertsState } from './alerts-query'
import { useAlerts } from './alerts-query'

beforeAll(setupDom)
afterAll(teardownDom)
afterEach(cleanup)

const EMPTY_SNAPSHOT: AlertsSnapshot = {
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

/** Renders the hook's result into text the DOM queries can read. */
function Probe({ client }: { client: AlertsClient }) {
  const { state, snapshot } = useAlerts({ client })
  return (
    <div>
      <span data-testid="state">{state}</span>
      <span data-testid="alert-count">{snapshot?.alerts.length ?? 'null'}</span>
    </div>
  )
}

function renderProbe(client: AlertsClient) {
  return render(
    <QueryClientProvider client={createRulesQueryClient()}>
      <Probe client={client} />
    </QueryClientProvider>,
  )
}

// The three write methods below are unused by this file's tests -- they
// exist only so a fake satisfies `AlertsClient`'s shape.
const unusedWrites = {
  create: async () => {
    throw new Error('not used by this test')
  },
  replace: async () => {
    throw new Error('not used by this test')
  },
  remove: async () => {
    throw new Error('not used by this test')
  },
}

function fakeClient(
  state: AlertsState,
  snapshotSpy: { calls: number } = { calls: 0 },
): AlertsClient {
  return {
    ...unusedWrites,
    status: async () => ({ state }),
    snapshot: async () => {
      snapshotSpy.calls += 1
      return { ...EMPTY_SNAPSHOT, alerts: [{ uid: 1 } as any] }
    },
  }
}

test('starts loading, then resolves to the status the client reports', async () => {
  const { getByTestId } = renderProbe(fakeClient('present'))
  await waitFor(() => expect(getByTestId('state').textContent).toBe('present'))
})

test('fetches snapshot only once status is present', async () => {
  const spy = { calls: 0 }
  const { getByTestId } = renderProbe(fakeClient('present', spy))
  await waitFor(() => expect(getByTestId('alert-count').textContent).toBe('1'))
  expect(spy.calls).toBe(1)
})

test('never fetches snapshot for an absent human', async () => {
  const spy = { calls: 0 }
  const { getByTestId } = renderProbe(fakeClient('absent', spy))
  await waitFor(() => expect(getByTestId('state').textContent).toBe('absent'))
  await act(async () => {})
  expect(spy.calls).toBe(0)
  expect(getByTestId('alert-count').textContent).toBe('null')
})

test('never fetches snapshot for an unreachable Poracle', async () => {
  const spy = { calls: 0 }
  const { getByTestId } = renderProbe(fakeClient('unreachable', spy))
  await waitFor(() =>
    expect(getByTestId('state').textContent).toBe('unreachable'),
  )
  await act(async () => {})
  expect(spy.calls).toBe(0)
})

test('never fetches snapshot when Poracle is unconfigured', async () => {
  const spy = { calls: 0 }
  const { getByTestId } = renderProbe(fakeClient('unconfigured', spy))
  await waitFor(() =>
    expect(getByTestId('state').textContent).toBe('unconfigured'),
  )
  await act(async () => {})
  expect(spy.calls).toBe(0)
})

function rejectingClient(
  snapshotSpy: { calls: number } = { calls: 0 },
): AlertsClient {
  return {
    ...unusedWrites,
    status: async () => {
      throw new Error('UNAUTHORIZED')
    },
    snapshot: async () => {
      snapshotSpy.calls += 1
      return EMPTY_SNAPSHOT
    },
  }
}

// `alerts.status` throws UNAUTHORIZED for a signed-out visitor and
// FORBIDDEN for a signed-in one the operator's Discord role gating
// excludes -- both ordinary outcomes on every route `BottomNav` mounts
// on. A rejected `status()` must fail closed to `absent` rather than
// stick at `loading` forever, which would leave the nav entry and a
// blank tab visible to exactly the population `absent` exists to hide
// them from.
test('a rejected status() fails closed to absent, not stuck loading', async () => {
  const spy = { calls: 0 }
  const { getByTestId } = renderProbe(rejectingClient(spy))
  await waitFor(() => expect(getByTestId('state').textContent).toBe('absent'))
  await act(async () => {})
  expect(spy.calls).toBe(0)
  expect(getByTestId('alert-count').textContent).toBe('null')
})
