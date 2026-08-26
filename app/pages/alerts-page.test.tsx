import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  waitFor,
  within,
} from '@testing-library/react'
import type { AlertsClient } from '../alerts/alerts-query'
import { createRulesQueryClient } from '../rules/rules-query'
import type { MasterfileClient, SpeciesEntry } from '../rules/use-names'
import { setupDom, teardownDom } from '../test-setup'
import { AlertsPage } from './alerts-page'

beforeAll(setupDom)
afterAll(teardownDom)
// The one-tick delay first, then cleanup: React's scheduler queues its own
// commit follow-up on a macrotask, not a microtask, so a query that settles
// late in a test (every write here does) can still have a scheduler
// callback in flight when the test function returns. Unmounting and
// `teardownDom` can both land before that callback fires, and it then
// throws reaching for a `window` this file no longer has -- see
// `bottom-nav.test.tsx`'s `afterEach` for the same fix.
afterEach(async () => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  cleanup()
})

// Not the global `screen`: it snapshots `document` at import time, before
// `setupDom` runs in `beforeAll`, and throws on every query as a result.
// Using the queries `render()` returns needs the DOM only once the test
// body runs -- `split-warning.test.tsx` and `species-picker.test.tsx` hit
// the same thing and sidestep it the same way.
function renderWith(client: AlertsClient, namesClient?: MasterfileClient) {
  return render(
    <QueryClientProvider client={createRulesQueryClient()}>
      <AlertsPage
        alertsClient={client}
        {...(namesClient ? { namesClient } : {})}
      />
    </QueryClientProvider>,
  )
}

const SPECIES_FIXTURE: SpeciesEntry[] = [
  { id: 246, name: 'Larvitar', forms: [] },
]

function fakeNamesClient(): MasterfileClient {
  return { species: () => Promise.resolve(SPECIES_FIXTURE) }
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

test('saving an edit adopts the new uid rather than keeping the old one', async () => {
  // PUT is delete plus insert. A cache keyed on the old uid would point at a
  // row that no longer exists, and the next edit would 404.
  const replaced: any[] = []
  const { getByText, getByTestId, queryByTestId, findByRole } = renderWith({
    status: async () => ({ state: 'present' }),
    snapshot: async () => ({
      ...EMPTY_SNAPSHOT,
      alerts: [{ uid: 7, pokemonId: 149, ivMin: 100, ivMax: 100 }],
    }),
    replace: async (args: any) => {
      replaced.push(args)
      return { uid: 99 }
    },
  } as unknown as AlertsClient)
  await waitFor(() => expect(getByText(/IV 100%/)).toBeTruthy())
  fireEvent.click(getByText(/IV 100%/))
  fireEvent.click(await findByRole('button', { name: /save/i }))
  await waitFor(() => expect(replaced[0].uid).toBe(7))
  await waitFor(() => expect(queryByTestId('alert-7')).toBeNull())
  expect(getByTestId('alert-99')).toBeTruthy()
})

test('deleting removes the card', async () => {
  const { getByTestId, queryByTestId, findByRole } = renderWith({
    status: async () => ({ state: 'present' }),
    snapshot: async () => ({
      ...EMPTY_SNAPSHOT,
      alerts: [{ uid: 7, pokemonId: 149 }],
    }),
    remove: async () => ({ deleted: [7] }),
  } as unknown as AlertsClient)
  await waitFor(() => expect(getByTestId('alert-7')).toBeTruthy())
  fireEvent.click(await findByRole('button', { name: /delete/i }))
  await waitFor(() => expect(queryByTestId('alert-7')).toBeNull())
})

test('picking a species from the New alert sheet creates and refetches', async () => {
  const created: any[] = []
  let refetched = false
  const { getByRole, getByText, findByRole } = renderWith(
    {
      status: async () => ({ state: 'present' }),
      snapshot: async () => {
        if (refetched) {
          return {
            ...EMPTY_SNAPSHOT,
            alerts: [{ uid: 12, pokemonId: 246 }],
          }
        }
        return EMPTY_SNAPSHOT
      },
      create: async (rule: any) => {
        created.push(rule)
        refetched = true
        return { created: 1, updated: 0, unchanged: 0 }
      },
    } as unknown as AlertsClient,
    fakeNamesClient(),
  )
  await waitFor(() => expect(getByText(/no alerts yet/i)).toBeTruthy())
  fireEvent.click(getByRole('button', { name: /new alert/i }))
  fireEvent.click(await findByRole('checkbox', { name: 'Larvitar' }))
  await waitFor(() => expect(created).toEqual([{ pokemonId: 246 }]))
  await waitFor(() => expect(getByText('Pokémon #246')).toBeTruthy())
})

test('switching profile refetches, because a stale currentProfileNo would still steer the next write', async () => {
  // The tab already lists every profile's rules at once
  // (`all_profiles=true`), so nothing about the visible rule list depends
  // on which profile is active. `human.currentProfileNo` does, and only a
  // refetch keeps it honest once Poracle's own answer has changed.
  let snapshots = 0
  const { getByRole, findByRole } = renderWith({
    status: async () => ({ state: 'present' }),
    snapshot: async () => {
      snapshots += 1
      return {
        ...EMPTY_SNAPSHOT,
        profiles: [
          { profileNo: 1, name: 'default' },
          { profileNo: 2, name: 'work' },
        ],
      }
    },
    switchProfile: async () => ({ currentProfileNo: 2 }),
  } as unknown as AlertsClient)
  await findByRole('listbox', { name: 'Profiles' })
  const before = snapshots
  // Scoped to the listbox: the copy-rules selects (visible once there is
  // more than one profile) also render `<option>work</option>`, and an
  // unscoped query cannot tell the two apart.
  const list = getByRole('listbox', { name: 'Profiles' })
  fireEvent.click(within(list).getByRole('option', { name: 'work' }))
  await waitFor(() => expect(snapshots).toBeGreaterThan(before))
})

test('a failed delete shows an error message instead of doing nothing', async () => {
  const { getByTestId, findByRole } = renderWith({
    status: async () => ({ state: 'present' }),
    snapshot: async () => ({
      ...EMPTY_SNAPSHOT,
      alerts: [{ uid: 7, pokemonId: 149 }],
    }),
    remove: async () => {
      throw new Error('Poracle is unreachable right now')
    },
  } as unknown as AlertsClient)
  await waitFor(() => expect(getByTestId('alert-7')).toBeTruthy())
  fireEvent.click(await findByRole('button', { name: /delete/i }))
  const alert = await findByRole('alert')
  expect(alert.textContent).toBe('Poracle is unreachable right now')
  // The bug this exists to fix: deleting appeared to succeed and the row
  // stayed. It should still be there, now with an explanation.
  expect(getByTestId('alert-7')).toBeTruthy()
})

// --- the five human-panel writes surface their own failures too ------------
//
// `useAlerts.error` already funnels create/replace/remove failures to the
// banner (see the test above); these five are newer surface area wired the
// same way, and nothing previously proved any of them actually reaches it
// rather than failing silently against a control that looks like it worked.

test('a failed setEnabled shows the banner rather than leaving the switch looking changed', async () => {
  const { getByRole, findByRole } = renderWith({
    status: async () => ({ state: 'present' }),
    snapshot: async () => EMPTY_SNAPSHOT,
    setEnabled: async () => {
      throw new Error('Poracle is unreachable right now')
    },
  } as unknown as AlertsClient)
  fireEvent.click(await findByRole('switch', { name: /alerts/i }))
  const alert = await findByRole('alert')
  expect(alert.textContent).toBe('Poracle is unreachable right now')
  expect(
    getByRole('switch', { name: /alerts/i }).getAttribute('aria-checked'),
  ).toBe('true')
})

test('a failed switchProfile shows the banner', async () => {
  const { findByRole } = renderWith({
    status: async () => ({ state: 'present' }),
    snapshot: async () => ({
      ...EMPTY_SNAPSHOT,
      profiles: [
        { profileNo: 1, name: 'default' },
        { profileNo: 2, name: 'work' },
      ],
    }),
    switchProfile: async () => {
      throw new Error('Poracle is unreachable right now')
    },
  } as unknown as AlertsClient)
  const list = within(await findByRole('listbox', { name: 'Profiles' }))
  fireEvent.click(list.getByRole('option', { name: 'work' }))
  const alert = await findByRole('alert')
  expect(alert.textContent).toBe('Poracle is unreachable right now')
})

test('a failed addProfile shows the banner', async () => {
  const { getByRole, findByRole } = renderWith({
    status: async () => ({ state: 'present' }),
    snapshot: async () => EMPTY_SNAPSHOT,
    addProfile: async () => {
      throw new Error('Poracle is unreachable right now')
    },
  } as unknown as AlertsClient)
  const input = await findByRole('textbox', { name: /new profile name/i })
  fireEvent.change(input, { target: { value: 'work' } })
  fireEvent.click(getByRole('button', { name: /add profile/i }))
  const alert = await findByRole('alert')
  expect(alert.textContent).toBe('Poracle is unreachable right now')
})

test('a failed deleteProfile shows the banner once the delete is confirmed', async () => {
  const { findByRole } = renderWith({
    status: async () => ({ state: 'present' }),
    snapshot: async () => ({
      ...EMPTY_SNAPSHOT,
      profiles: [
        { profileNo: 1, name: 'default' },
        { profileNo: 2, name: 'work' },
      ],
    }),
    deleteProfile: async () => {
      throw new Error('Poracle is unreachable right now')
    },
  } as unknown as AlertsClient)
  fireEvent.click(await findByRole('button', { name: /delete profile work/i }))
  const dialog = await findByRole('alertdialog')
  fireEvent.click(within(dialog).getByRole('button', { name: /^delete$/i }))
  const alert = await findByRole('alert')
  expect(alert.textContent).toBe('Poracle is unreachable right now')
})

test('a failed copyProfileRules shows the banner once the copy is confirmed', async () => {
  const { getByRole, findByRole } = renderWith({
    status: async () => ({ state: 'present' }),
    snapshot: async () => ({
      ...EMPTY_SNAPSHOT,
      profiles: [
        { profileNo: 1, name: 'default' },
        { profileNo: 2, name: 'work' },
      ],
    }),
    copyProfileRules: async () => {
      throw new Error('Poracle is unreachable right now')
    },
  } as unknown as AlertsClient)
  fireEvent.change(await findByRole('combobox', { name: /copy rules into/i }), {
    target: { value: '2' },
  })
  fireEvent.click(getByRole('button', { name: /copy rules/i }))
  const dialog = await findByRole('alertdialog')
  fireEvent.click(within(dialog).getByRole('button', { name: /^copy rules$/i }))
  const alert = await findByRole('alert')
  expect(alert.textContent).toBe('Poracle is unreachable right now')
})
