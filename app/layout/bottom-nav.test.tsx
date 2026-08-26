import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import type { AlertsClient, AlertsState } from '../alerts/alerts-query'
import { createRulesQueryClient } from '../rules/rules-query'
import { setupDom, teardownDom } from '../test-setup'
import { BottomNav } from './bottom-nav'

// `@testing-library/dom`'s `screen` singleton snapshots `document` the
// moment the module is first imported (dist/screen.js), so it only works
// when a global document exists before any test file's imports run — which
// means registering it process-wide via bunfig's preload, for every
// workspace in this monorepo. That broke unrelated suites elsewhere (see
// test-setup.ts). Using the queries `render` returns needs the DOM only once
// the test body actually runs, so registering it here in beforeAll, scoped to
// this file, is enough.
beforeAll(setupDom)
afterAll(teardownDom)

// Every render is appended to the same document and stays there, so without
// this each test sees the leftovers of the ones before it.
//
// The one-tick delay first: React's scheduler queues its own commit
// follow-up work on a macrotask (MessageChannel), not a microtask, so a
// query that settles late in a test can still have a scheduler callback
// in flight when the test function returns. Unmounting first and
// `teardownDom` afterward (in `afterAll`) can both land before that
// callback fires, and it then throws reaching for a `window` this file no
// longer has -- reported as an "Unhandled error between tests" rather
// than a failing assertion, so it is easy to miss.
afterEach(async () => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  cleanup()
})

// The write methods are unused by this file's tests -- they exist only so a
// fake satisfies `AlertsClient`'s shape.
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

function fakeAlertsClient(state: AlertsState): AlertsClient {
  return {
    ...unusedWrites,
    status: async () => ({ state }),
    snapshot: async () => ({
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
    }),
  }
}

function renderNav(path: string, state: AlertsState = 'present') {
  return render(
    <QueryClientProvider client={createRulesQueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <BottomNav alertsClient={fakeAlertsClient(state)} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function renderNavWithRejectingClient(path: string) {
  const calls = { count: 0 }
  const client: AlertsClient = {
    ...unusedWrites,
    status: async () => {
      calls.count += 1
      throw new Error('UNAUTHORIZED')
    },
    snapshot: async () => {
      throw new Error('should never be called')
    },
  }
  return {
    calls,
    ...render(
      <QueryClientProvider client={createRulesQueryClient()}>
        <MemoryRouter initialEntries={[path]}>
          <BottomNav alertsClient={client} />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  }
}

// Queries are scoped to the container this render owns rather than the whole
// body. The hub renders a link labelled Filters too, so a document-wide query
// finds more than one and getByRole throws for being ambiguous. Whether that
// happened depended on which files had already run, which is why this passed
// locally and failed in CI.
test('shows the four primary destinations in order', async () => {
  const { container } = renderNav('/map')
  await waitFor(() =>
    expect(within(container).getAllByRole('link')).toHaveLength(4),
  )
  const labels = within(container)
    .getAllByRole('link')
    .map((link) => link.textContent)
  expect(labels).toEqual(['Map', 'Filters', 'Alerts', 'Me'])
})

test('marks the active destination for assistive tech', async () => {
  const { container } = renderNav('/filters')
  await waitFor(() =>
    expect(
      within(container).getByRole('link', { name: 'Filters' }),
    ).toBeTruthy(),
  )
  const active = within(container).getByRole('link', { name: 'Filters' })
  expect(active.getAttribute('aria-current')).toBe('page')
})

// Poracle never creates a human on its own, so an account without one gets
// no Alerts entry at all -- not disabled, not greyed, absent from the nav
// the same way it is absent from the tab (`alerts-page.tsx`).
test('hides the Alerts destination for an account with no Poracle human', async () => {
  const { container } = renderNav('/map', 'absent')
  await waitFor(() =>
    expect(within(container).getAllByRole('link')).toHaveLength(3),
  )
  const labels = within(container)
    .getAllByRole('link')
    .map((link) => link.textContent)
  expect(labels).toEqual(['Map', 'Filters', 'Me'])
})

test('hides the Alerts destination when the operator has no Poracle configured', async () => {
  const { container } = renderNav('/map', 'unconfigured')
  await waitFor(() =>
    expect(within(container).getAllByRole('link')).toHaveLength(3),
  )
})

// `alerts.status` rejects for a signed-out visitor and for a signed-in one
// the operator's role gating excludes -- both are the common case, not an
// edge case, and both must fail closed to no Alerts entry rather than
// leaving it up while stuck on a permanently-loading state.
test('hides the Alerts destination when status() rejects', async () => {
  const { container, calls } = renderNavWithRejectingClient('/map')
  await waitFor(() => expect(calls.count).toBeGreaterThan(0))
  await waitFor(() =>
    expect(within(container).getAllByRole('link')).toHaveLength(3),
  )
  const labels = within(container)
    .getAllByRole('link')
    .map((link) => link.textContent)
  expect(labels).toEqual(['Map', 'Filters', 'Me'])
})

// The column count keys off how many destinations are actually rendered,
// not off the state, so a hidden Alerts entry never leaves the nav
// visibly lopsided (three links in a four-column grid).
test('the grid narrows to match the destinations actually shown', async () => {
  const { container } = renderNav('/map', 'absent')
  await waitFor(() =>
    expect(within(container).getAllByRole('link')).toHaveLength(3),
  )
  const nav = container.querySelector('nav') as HTMLElement
  expect(nav.className).toContain('grid-cols-3')
  expect(nav.className).not.toContain('grid-cols-4')
})

test('the grid uses all four columns when every destination is shown', async () => {
  const { container } = renderNav('/map', 'present')
  await waitFor(() =>
    expect(within(container).getAllByRole('link')).toHaveLength(4),
  )
  const nav = container.querySelector('nav') as HTMLElement
  expect(nav.className).toContain('grid-cols-4')
})
