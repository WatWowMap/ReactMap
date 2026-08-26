import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { QueryClientProvider } from '@tanstack/react-query'
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react'
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

/**
 * Renders the hook's result into text the DOM queries can read, plus one
 * button per write method -- `error`'s only consumer that matters is
 * whether a failed write is still reachable after the promise it came
 * from has already settled, and a button click is what exercises that
 * the same way a real card's Save or Delete would.
 */
function Probe({ client }: { client: AlertsClient }) {
  const { state, snapshot, error, create, replace, remove } = useAlerts({
    client,
  })
  return (
    <div>
      <span data-testid="state">{state}</span>
      <span data-testid="alert-count">{snapshot?.alerts.length ?? 'null'}</span>
      <span data-testid="error">
        {error instanceof Error ? error.message : String(error)}
      </span>
      <button type="button" onClick={() => void create({ pokemonId: 1 })}>
        create
      </button>
      <button type="button" onClick={() => void replace(1, { ivMin: 100 })}>
        replace
      </button>
      <button type="button" onClick={() => void remove(1)}>
        remove
      </button>
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

// The write methods below are unused by this file's tests -- they exist only
// so a fake satisfies `AlertsClient`'s shape.
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
  setEnabled: async () => {
    throw new Error('not used by this test')
  },
  switchProfile: async () => {
    throw new Error('not used by this test')
  },
  addProfile: async () => {
    throw new Error('not used by this test')
  },
  deleteProfile: async () => {
    throw new Error('not used by this test')
  },
  copyProfileRules: async () => {
    throw new Error('not used by this test')
  },
  setAreas: async () => {
    throw new Error('not used by this test')
  },
  addLocation: async () => {
    throw new Error('not used by this test')
  },
  updateLocation: async () => {
    throw new Error('not used by this test')
  },
  deleteLocation: async () => {
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

// The fifth instance of a repeated shape in this plan: a fake that only
// ever resolves hides a write path that only ever throws. Each of these
// rejects one write and asserts the failure is still readable through
// `error` after the failed promise has already settled -- the same
// property `useRules.error` (`rules-query.ts`) has always had, which
// `create`/`replace`/`remove` here silently dropped until now.
function writingClient(overrides: Partial<AlertsClient>): AlertsClient {
  return {
    ...unusedWrites,
    status: async () => ({ state: 'present' }),
    snapshot: async () => ({
      ...EMPTY_SNAPSHOT,
      alerts: [{ uid: 1, pokemonId: 149 } as any],
    }),
    ...overrides,
  }
}

test('a rejected create surfaces through error rather than doing nothing', async () => {
  const { getByTestId, getByText } = renderProbe(
    writingClient({
      create: async () => {
        throw new Error('pokemon_id is required')
      },
    }),
  )
  await waitFor(() => expect(getByTestId('alert-count').textContent).toBe('1'))
  fireEvent.click(getByText('create'))
  await waitFor(() =>
    expect(getByTestId('error').textContent).toBe('pokemon_id is required'),
  )
  // Nothing was written -- the one seeded row is still the only one.
  expect(getByTestId('alert-count').textContent).toBe('1')
})

test('a rejected replace surfaces through error and leaves the row untouched', async () => {
  const { getByTestId, getByText } = renderProbe(
    writingClient({
      replace: async () => {
        throw new Error('Poracle is unreachable right now')
      },
    }),
  )
  await waitFor(() => expect(getByTestId('alert-count').textContent).toBe('1'))
  fireEvent.click(getByText('replace'))
  await waitFor(() =>
    expect(getByTestId('error').textContent).toBe(
      'Poracle is unreachable right now',
    ),
  )
  expect(getByTestId('alert-count').textContent).toBe('1')
})

test('a rejected remove surfaces through error and leaves the card in place', async () => {
  const { getByTestId, getByText } = renderProbe(
    writingClient({
      remove: async () => {
        throw new Error('not found')
      },
    }),
  )
  await waitFor(() => expect(getByTestId('alert-count').textContent).toBe('1'))
  fireEvent.click(getByText('remove'))
  await waitFor(() =>
    expect(getByTestId('error').textContent).toBe('not found'),
  )
  // Deleting appeared to succeed and the row stayed -- exactly the bug
  // report this whole change exists to fix. It should still be there.
  expect(getByTestId('alert-count').textContent).toBe('1')
})
