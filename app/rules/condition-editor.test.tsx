import { afterAll, afterEach, beforeAll, expect, test, vi } from 'bun:test'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { setupDom, teardownDom } from '../test-setup'
import { ConditionEditor } from './condition-editor'
import type { Vocabulary } from './condition-vocabulary'

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

/**
 * The brief's snippet used `screen.getByRole(..., { name: /add condition/i })`
 * -- `screen` binds to `document` at import time, before `setupDom` runs in
 * this file's `beforeAll`, and throws on every query (`split-warning.test.tsx`
 * and `species-picker.test.tsx` hit the same thing and use `render`'s own
 * bound queries instead). It also asked for an accessible name matching
 * "add condition", but every other test in this file -- and
 * `filters-page.test.tsx` -- opens the same menu via the literal name '+',
 * which this refactor must not change. Both are adapted to the file's
 * existing convention; the assertion itself (a foreign vocabulary offers
 * its own conditions and none of ReactMap's) is unchanged from the brief.
 */
test("a foreign vocabulary offers its own conditions and none of ReactMap's", () => {
  const vocab: Vocabulary = {
    id: 'poracle',
    conditions: [
      {
        kind: 'range',
        key: 'weight',
        label: 'Weight',
        minField: 'weightMin',
        maxField: 'weightMax',
      },
    ],
    tail: [],
  }
  const { getByRole, getByText, queryByText } = render(
    <ConditionEditor vocabulary={vocab} />,
  )
  fireEvent.click(getByRole('button', { name: '+' }))
  expect(getByText('Weight')).toBeTruthy()
  expect(queryByText('IV')).toBeNull()
})

test('a row label is capitalised for the form, not left lowercase as the sentence renderer wants it', () => {
  // REACTMAP_VOCABULARY's `attack` label is lowercase so it reads right
  // mid-sentence in describeWithVocabulary ("attack 10+"); a standalone
  // form label is not mid-sentence, so the editor capitalises it itself
  // rather than the vocabulary carrying a second, editor-only casing.
  const { getByRole, getByText, queryByText } = render(<ConditionEditor />)
  fireEvent.click(getByRole('button', { name: '+' }))
  fireEvent.click(getByRole('option', { name: /^attack$/i }))
  expect(getByText('Attack')).toBeTruthy()
  expect(queryByText('attack')).toBeNull()
})

test('an editor with a foreign onChange and no vocabulary does not compile', () => {
  /** Task 5's `AlertRow` shape, cut down: Poracle's columns, not a rule's. */
  type AlertPatch = Partial<{ ping: string; weightMin: number }>
  // Omitting `vocabulary` pins the patch type to ReactMap's `RulePatch`,
  // which is what the default vocabulary actually describes. This used to
  // infer `P` from `onChange` alone, so the editor rendered ReactMap's
  // rows and handed the caller a rule patch under Poracle's name. The
  // directive fails typecheck if that hole ever reopens.
  const bad = (
    // @ts-expect-error
    <ConditionEditor onChange={(patch: AlertPatch) => patch} />
  )
  expect(bad).toBeTruthy()
})
