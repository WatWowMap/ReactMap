import { afterAll, afterEach, beforeAll, expect, test, vi } from 'bun:test'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { setupDom, teardownDom } from '../test-setup'
import { ConditionEditor } from './condition-editor'

beforeAll(setupDom)
afterAll(teardownDom)
afterEach(cleanup)

test('conditions AND together, and + adds another', () => {
  const onChange = vi.fn()
  const { getByRole } = render(
    <ConditionEditor
      conditions={[{ type: 'iv', min: 90 }]}
      onChange={onChange}
    />,
  )
  fireEvent.click(getByRole('button', { name: '+' }))
  fireEvent.click(getByRole('option', { name: /level/i }))
  const patch = onChange.mock.calls.at(-1)?.[0]
  // Both survive: a rule is the conjunction of its conditions.
  expect(patch?.ivMin).toBe(90)
  expect(patch?.levelMin).toBeDefined()
})

test('the PvP control offers one league, not three', () => {
  const { getAllByRole } = render(<ConditionEditor />)
  // One radio group, three mutually-exclusive leagues -- not three
  // independently-settable range widgets, one per league, the way 1.x did.
  expect(getAllByRole('radio', { name: /little|great|ultra/i })).toHaveLength(3)
})

test('the + menu never offers a condition that is already active', () => {
  const { getByRole, queryByRole } = render(
    <ConditionEditor conditions={[{ type: 'iv', min: 0 }]} />,
  )
  fireEvent.click(getByRole('button', { name: '+' }))
  expect(queryByRole('option', { name: /^iv$/i })).toBeNull()
  expect(getByRole('option', { name: /^cp$/i })).toBeTruthy()
})

test('a seeded condition renders its current value, not a blank row', () => {
  const { getByDisplayValue } = render(
    <ConditionEditor conditions={[{ type: 'cp', min: 500, max: 2500 }]} />,
  )
  expect(getByDisplayValue('500')).toBeTruthy()
  expect(getByDisplayValue('2500')).toBeTruthy()
})

test('picking a PvP league patches pvpLeague with the CP cap, not an index', () => {
  const onChange = vi.fn()
  const { getByRole } = render(<ConditionEditor onChange={onChange} />)
  fireEvent.click(getByRole('radio', { name: /great/i }))
  const patch = onChange.mock.calls.at(-1)?.[0]
  // rule_pokemon.pvp_league is NULL | 500 | 1500 | 2500 -- see
  // server/src/db/rules-schema.ts and rule-row.ts's LEAGUE_BY_CAP.
  expect(patch?.pvpLeague).toBe(1500)
})
