import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, waitFor } from '@testing-library/react'
import { ruleFixture } from '../rules/rule-fixtures'
import type { Rule } from '../rules/rule-types'
import type { RulesClient } from '../rules/rules-query'
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

function fakeRulesClient(rules: Rule[]): RulesClient {
  return {
    list: () => Promise.resolve(rules),
    update: async () => {},
  }
}

function fakeNamesClient(): MasterfileClient {
  return { species: () => Promise.resolve(SPECIES_FIXTURE) }
}

/** Renders `FiltersPage` against a fake rules list, no network involved. */
function renderWithRules(rules: Rule[]) {
  const queryClient = createRulesQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <FiltersPage
        rulesClient={fakeRulesClient(rules)}
        namesClient={fakeNamesClient()}
      />
    </QueryClientProvider>,
  )
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
