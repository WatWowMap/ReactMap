import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { cleanup, fireEvent, render } from '@testing-library/react'
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
      enabled: true,
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

test('the whole card is a control that opens the rule, keyboard included', () => {
  let opened = 0
  const { getByRole } = render(
    <RuleCard
      group={groupFixture({ name: 'Hundos', speciesIds: [null] })}
      names={NAMES}
      onOpen={() => {
        opened += 1
      }}
    />,
  )
  // A real button, so it is focusable and announced as something that can
  // be opened -- not a div with a click handler.
  fireEvent.click(getByRole('button', { name: 'Edit Hundos' }))
  expect(opened).toBe(1)
})

// The list still shows a rule that is off -- hiding it would defeat the
// point of being able to turn one off rather than delete it. So the card
// stays readable, stays openable, and says plainly that it is off.

test('a card carries a switch that reports the state it is moving to', () => {
  const toggles: boolean[] = []
  const { getByRole } = render(
    <RuleCard
      group={groupFixture({ name: 'Hundos', speciesIds: [null] })}
      names={NAMES}
      onToggle={(enabled) => toggles.push(enabled)}
    />,
  )
  fireEvent.click(getByRole('switch', { name: /hundos/i }))
  expect(toggles).toEqual([false])
})

test('a disabled card says so, and its switch turns it back on', () => {
  const toggles: boolean[] = []
  const group = groupFixture({ name: 'Hundos', speciesIds: [null] })
  const { getByRole, getByText } = render(
    <RuleCard
      group={{ ...group, sample: { ...group.sample, enabled: false } }}
      names={NAMES}
      onToggle={(enabled) => toggles.push(enabled)}
    />,
  )
  expect(getByText('Off')).toBeTruthy()
  fireEvent.click(getByRole('switch', { name: /hundos/i }))
  expect(toggles).toEqual([true])
})

test('a disabled card is still openable for editing', () => {
  let opened = 0
  const group = groupFixture({ name: 'Hundos', speciesIds: [null] })
  const { getByRole } = render(
    <RuleCard
      group={{ ...group, sample: { ...group.sample, enabled: false } }}
      names={NAMES}
      onOpen={() => {
        opened += 1
      }}
    />,
  )
  fireEvent.click(getByRole('button', { name: 'Edit Hundos' }))
  expect(opened).toBe(1)
})
