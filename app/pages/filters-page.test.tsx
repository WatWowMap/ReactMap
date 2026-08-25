import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { ruleFixture } from '../rules/rule-fixtures'
import type { Rule } from '../rules/rule-types'
import type { RuleCreateInput, RulesClient } from '../rules/rules-query'
import { createRulesQueryClient } from '../rules/rules-query'
import type { MasterfileClient, SpeciesEntry } from '../rules/use-names'
import { setupDom, teardownDom } from '../test-setup'
import { FiltersPage } from './filters-page'

beforeAll(setupDom)
afterAll(teardownDom)
// `render()` queries are bound to `document.body`, not to the returned
// container, so a prior test's markup is still visible to the next test's
// queries unless the render tree is unmounted here.
afterEach(cleanup)

const SPECIES_FIXTURE: SpeciesEntry[] = [
  { id: 246, name: 'Larvitar', forms: [] },
]

interface FakeRulesClient extends RulesClient {
  created: RuleCreateInput[]
  updated: { ruleIds: number[]; patch: unknown }[]
}

function fakeRulesClient(rules: Rule[]): FakeRulesClient {
  const created: RuleCreateInput[] = []
  const updated: { ruleIds: number[]; patch: unknown }[] = []
  return {
    created,
    updated,
    list: () => Promise.resolve(rules),
    create: async (input) => {
      created.push(input)
    },
    update: async (ruleIds, patch) => {
      updated.push({ ruleIds, patch })
    },
  }
}

function fakeNamesClient(): MasterfileClient {
  return { species: () => Promise.resolve(SPECIES_FIXTURE) }
}

/** Renders `FiltersPage` against a fake rules list, no network involved. */
function renderWithRules(rules: Rule[]) {
  const queryClient = createRulesQueryClient()
  const client = fakeRulesClient(rules)
  return {
    client,
    ...render(
      <QueryClientProvider client={queryClient}>
        <FiltersPage rulesClient={client} namesClient={fakeNamesClient()} />
      </QueryClientProvider>,
    ),
  }
}

/** `count` rules sharing a name, each targeting its own species -- one group. */
function rareSpawns(count: number, startId = 1): Rule[] {
  return Array.from({ length: count }, (_, i) =>
    ruleFixture({
      id: startId + i,
      name: 'Rare spawns',
      speciesId: 1000 + i,
    }),
  )
}

test('the Alerts tab is present and disabled', () => {
  const { getByRole } = renderWithRules([])
  const tab = getByRole('tab', { name: /alerts/i }) as HTMLButtonElement
  expect(tab.disabled).toBe(true)
})

test('a group of 25 renders one card showing a count', async () => {
  const { getAllByText, getByText } = renderWithRules(rareSpawns(25))
  await waitFor(() => expect(getAllByText('Rare spawns')).toHaveLength(1))
  expect(getByText('25 Pokémon')).toBeTruthy()
})

test('a group of one shows the species name, not "1 Pokémon"', async () => {
  const { findByText, queryByText } = renderWithRules([
    ruleFixture({ id: 1, name: 'Rare spawns', speciesId: 246 }),
  ])
  expect(await findByText('Larvitar')).toBeTruthy()
  expect(queryByText('1 Pokémon')).toBeNull()
})

test('a rule with no species shows Any Pokémon', async () => {
  const { findByText } = renderWithRules([
    ruleFixture({ id: 1, name: 'Hundos', speciesId: null, ivMin: 100 }),
  ])
  expect(await findByText('Any Pokémon')).toBeTruthy()
})

test('two cards sharing a name are distinguished by their subjects', async () => {
  const { getAllByText, getByText } = renderWithRules([
    ...rareSpawns(24),
    ruleFixture({ id: 100, name: 'Rare spawns', speciesId: 246, size: 'xl' }),
  ])
  await waitFor(() => expect(getAllByText('Rare spawns')).toHaveLength(2))
  expect(getByText('24 Pokémon')).toBeTruthy()
  expect(getByText('Larvitar')).toBeTruthy()
})

test('the empty state offers the four starting points', async () => {
  const { findByRole } = renderWithRules([])
  for (const name of ['Everything', '100% IV', 'Great League', 'Rare spawns']) {
    expect(await findByRole('button', { name })).toBeTruthy()
  }
})

test('a starting point writes a real rule rather than holding a preset', async () => {
  const { client, findByRole } = renderWithRules([])
  fireEvent.click(await findByRole('button', { name: 'Great League' }))
  await waitFor(() => expect(client.created).toHaveLength(1))
  expect(client.created[0]).toMatchObject({
    name: 'Great League',
    speciesIds: [null],
    pvpLeague: 1500,
  })
})

test('the page header can create a filter without emptying the list first', async () => {
  const { client, findByRole } = renderWithRules(rareSpawns(1))
  fireEvent.click(await findByRole('button', { name: /new filter/i }))
  await waitFor(() => expect(client.created).toHaveLength(1))
  expect(client.created[0]).toMatchObject({ name: 'New filter' })
})

test('clicking a card opens its editor', async () => {
  const { findByRole, getByRole } = renderWithRules([
    ruleFixture({ id: 1, name: 'Hundos', speciesId: null, ivMin: 100 }),
  ])
  fireEvent.click(await findByRole('button', { name: 'Edit Hundos' }))
  // The sheet is the only thing on the page that can commit an edit.
  expect(getByRole('button', { name: 'Save' })).toBeTruthy()
})

test('an edit to a one-row group commits without a split warning', async () => {
  const { client, findByRole, getByRole, queryByRole } = renderWithRules([
    ruleFixture({ id: 1, name: 'Hundos', speciesId: null, ivMin: 100 }),
  ])
  fireEvent.click(await findByRole('button', { name: 'Edit Hundos' }))
  // Add a condition rather than typing into one: `fireEvent.change` does
  // not drive React's controlled-input path under this DOM shim, which is
  // why every other editor test reaches for the `+` menu too.
  fireEvent.click(getByRole('button', { name: '+' }))
  fireEvent.click(getByRole('option', { name: /^level$/i }))
  fireEvent.click(getByRole('button', { name: 'Save' }))

  expect(queryByRole('alertdialog')).toBeNull()
  await waitFor(() => expect(client.updated).toHaveLength(1))
  const committed = client.updated[0]
  expect(committed?.ruleIds).toEqual([1])
  expect(
    (committed?.patch as { levelMin?: number } | undefined)?.levelMin,
  ).toBeDefined()
})

test('singling one species out of a group warns before it separates', async () => {
  const { client, findByRole, getByRole } = renderWithRules([
    ...rareSpawns(24),
    ruleFixture({ id: 100, name: 'Rare spawns', speciesId: 246 }),
  ])
  fireEvent.click(await findByRole('button', { name: 'Edit Rare spawns' }))
  fireEvent.click(getByRole('radio', { name: 'Larvitar' }))
  fireEvent.click(getByRole('button', { name: '+' }))
  fireEvent.click(getByRole('option', { name: /^size$/i }))
  fireEvent.click(getByRole('button', { name: 'Save' }))

  const dialog = await findByRole('alertdialog')
  expect(dialog.textContent).toContain('Larvitar')
  expect(dialog.textContent).toContain('24')
  expect(client.updated).toHaveLength(0)

  fireEvent.click(getByRole('button', { name: 'Separate' }))
  await waitFor(() => expect(client.updated).toHaveLength(1))
  expect(client.updated[0]?.ruleIds).toEqual([100])
})

test('an edit aimed at every member rewrites them all, and warns about nothing', async () => {
  const { client, findByRole, getByRole, queryByRole } = renderWithRules(
    rareSpawns(3),
  )
  fireEvent.click(await findByRole('button', { name: 'Edit Rare spawns' }))
  fireEvent.click(getByRole('button', { name: '+' }))
  fireEvent.click(getByRole('option', { name: /^size$/i }))
  fireEvent.click(getByRole('button', { name: 'Save' }))

  expect(queryByRole('alertdialog')).toBeNull()
  await waitFor(() => expect(client.updated).toHaveLength(1))
  expect(client.updated[0]?.ruleIds).toEqual([1, 2, 3])
})

test('the card switch turns the whole group off in one write', async () => {
  const { client, findByRole } = renderWithRules(rareSpawns(25))

  fireEvent.click(await findByRole('switch', { name: /disable rare spawns/i }))

  await waitFor(() => expect(client.updated).toHaveLength(1))
  expect(client.updated[0]?.ruleIds).toHaveLength(25)
  expect(client.updated[0]?.patch).toEqual({ enabled: false })
})

test('a group that is off still shows, and its switch turns it back on', async () => {
  const off = rareSpawns(3).map((rule) => ({ ...rule, enabled: false }))
  const { client, findByRole, getByText } = renderWithRules(off)

  const toggle = await findByRole('switch', { name: /enable rare spawns/i })
  expect(getByText('Off')).toBeTruthy()
  fireEvent.click(toggle)

  await waitFor(() => expect(client.updated).toHaveLength(1))
  expect(client.updated[0]?.patch).toEqual({ enabled: true })
})
