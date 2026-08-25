import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { cleanup, render } from '@testing-library/react'
import { setupDom, teardownDom } from '../test-setup'
import { RuleCard } from './rule-card'
import type { RuleGroup } from './rule-types'
import type { NamesLookup } from './use-names'

beforeAll(setupDom)
afterAll(teardownDom)
afterEach(cleanup)

const NAMES: NamesLookup = {
  species: (id) => (id === 246 ? 'Larvitar' : `#${id}`),
  label: (speciesId) => (speciesId === 246 ? 'Larvitar' : `#${speciesId}`),
}

function groupFixture(overrides: Partial<RuleGroup>): RuleGroup {
  return {
    id: '1',
    name: 'Rule',
    ruleIds: [1],
    speciesIds: [null],
    sample: {
      id: 1,
      category: 'pokemon',
      name: 'Rule',
      size: null,
      glow: null,
      notify: false,
      speciesId: null,
      formId: null,
      pvpTargetSpecies: null,
      ivMin: null,
      ivMax: null,
      atkMin: null,
      atkMax: null,
      defMin: null,
      defMax: null,
      staMin: null,
      staMax: null,
      levelMin: null,
      levelMax: null,
      cpMin: null,
      cpMax: null,
      gender: null,
      sizeMin: null,
      sizeMax: null,
      pvpLeague: null,
      pvpRankMin: null,
      pvpRankMax: null,
      exclusions: [],
    },
    ...overrides,
  }
}

test('a null species subject reads as Any Pokémon', () => {
  const { getByText } = render(
    <RuleCard group={groupFixture({ speciesIds: [null] })} names={NAMES} />,
  )
  expect(getByText('Any Pokémon')).toBeTruthy()
})

test('a single-species subject is the species name, never a count', () => {
  const { getByText, queryByText } = render(
    <RuleCard group={groupFixture({ speciesIds: [246] })} names={NAMES} />,
  )
  expect(getByText('Larvitar')).toBeTruthy()
  expect(queryByText('1 Pokémon')).toBeNull()
})

test('a multi-species subject is a count, not a list of names', () => {
  const { getByText } = render(
    <RuleCard group={groupFixture({ speciesIds: [1, 2, 3] })} names={NAMES} />,
  )
  expect(getByText('3 Pokémon')).toBeTruthy()
})

test('the card title is the rule name', () => {
  const { getByText } = render(
    <RuleCard
      group={groupFixture({ name: 'Hundos', speciesIds: [null] })}
      names={NAMES}
    />,
  )
  expect(getByText('Hundos')).toBeTruthy()
})
