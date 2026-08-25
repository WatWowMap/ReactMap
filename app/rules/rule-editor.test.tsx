/**
 * The split warning has to fire for `enabled` exactly as it does for a
 * condition or an appearance change: nothing in the schema can say "off
 * for this one species" while the row still shares a card with
 * twenty-four others, so singling one member out peels it into its own
 * rule. This file proves the existing gate covers the new field rather
 * than assuming it does.
 */

import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { setupDom, teardownDom } from '../test-setup'
import { RuleEditor } from './rule-editor'
import { ruleFixture } from './rule-fixtures'
import type { RuleGroup } from './rule-types'
import type { NamesLookup } from './use-names'

beforeAll(setupDom)
afterAll(teardownDom)
afterEach(cleanup)

const NAMES: NamesLookup = {
  species: (id) => (id === 246 ? 'Larvitar' : `#${id}`),
  label: (speciesId) => (speciesId === 246 ? 'Larvitar' : `#${speciesId}`),
}

/** A card of two: enough to have a member to single out. */
function pairGroup(): RuleGroup {
  return {
    id: '1',
    name: 'Rare',
    ruleIds: [1, 2],
    speciesIds: [147, 246],
    sample: ruleFixture({ id: 1, name: 'Rare', speciesId: 147 }),
  }
}

test('switching the whole card off commits to every member, no warning', () => {
  const commits: Array<[number[], unknown]> = []
  const { getByRole } = render(
    <RuleEditor
      group={pairGroup()}
      names={NAMES}
      onCommit={(ruleIds, patch) => commits.push([ruleIds, patch])}
    />,
  )

  fireEvent.click(getByRole('switch', { name: /enabled/i }))
  fireEvent.click(getByRole('button', { name: /save/i }))

  expect(commits).toEqual([[[1, 2], { enabled: false }]])
})

test('switching one member off warns first, then commits to that member alone', () => {
  const commits: Array<[number[], unknown]> = []
  const { getAllByText, getByRole } = render(
    <RuleEditor
      group={pairGroup()}
      names={NAMES}
      onCommit={(ruleIds, patch) => commits.push([ruleIds, patch])}
    />,
  )

  fireEvent.click(getByRole('radio', { name: 'Larvitar' }))
  fireEvent.click(getByRole('switch', { name: /enabled/i }))
  fireEvent.click(getByRole('button', { name: /save/i }))

  // Nothing written yet: the warning is the gate.
  expect(commits).toEqual([])
  expect(getAllByText(/separate larvitar/i).length).toBeGreaterThan(0)

  fireEvent.click(getByRole('button', { name: /^separate$/i }))
  expect(commits).toEqual([[[2], { enabled: false }]])
})
