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
afterEach(cleanup)

function fakeAlertsClient(state: AlertsState): AlertsClient {
  return {
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
