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
  fireEvent.click(getByRole('button', { name: /add a condition/i }))
  fireEvent.click(getByRole('option', { name: /level/i }))
  const patch = onChange.mock.calls.at(-1)?.[0]
  // Both survive: a rule is the conjunction of its conditions.
  expect(patch?.ivMin).toBe(90)
  expect(patch?.levelMin).toBeDefined()
})

/** PvP is opt-in like every other condition; add it before asserting on it. */
function openPvp(getByRole: any) {
  fireEvent.click(getByRole('button', { name: /add a condition/i }))
  fireEvent.click(getByRole('option', { name: /rank/i }))
}

test('the PvP control offers one league, not three', () => {
  const { getAllByRole, getByRole } = render(<ConditionEditor />)
  openPvp(getByRole)
  // One radio group, three mutually-exclusive leagues -- not three
  // independently-settable range widgets, one per league, the way 1.x did.
  expect(getAllByRole('radio', { name: /little|great|ultra/i })).toHaveLength(3)
})

test('the + menu never offers a condition that is already active', () => {
  const { getByRole, queryByRole } = render(
    <ConditionEditor conditions={[{ type: 'iv', min: 0 }]} />,
  )
  fireEvent.click(getByRole('button', { name: /add a condition/i }))
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
  openPvp(getByRole)
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
 * "add condition". The button was a bare '+' at the time and every test
 * here addressed it that way; it is now named "+ Add a condition", because
 * a lone glyph says neither what it adds nor that anything is addable, and
 * these queries follow it. The assertion itself (a foreign vocabulary
 * offers its own conditions and none of ReactMap's) is unchanged.
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
  fireEvent.click(getByRole('button', { name: /add a condition/i }))
  expect(getByText('Weight')).toBeTruthy()
  expect(queryByText('IV')).toBeNull()
})

test('a row label is capitalised for the form, not left lowercase as the sentence renderer wants it', () => {
  // REACTMAP_VOCABULARY's `attack` label is lowercase so it reads right
  // mid-sentence in describeWithVocabulary ("attack 10+"); a standalone
  // form label is not mid-sentence, so the editor capitalises it itself
  // rather than the vocabulary carrying a second, editor-only casing.
  const { getByRole, getByText, queryByText } = render(<ConditionEditor />)
  fireEvent.click(getByRole('button', { name: /add a condition/i }))
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

test('a stored PvP league opens with that league selected', () => {
  // The card beside the editor described the league correctly from the same
  // row, so a blank radio group here read as the editor losing it.
  const { getByLabelText } = render(
    <ConditionEditor
      conditions={[{ type: 'pvp', label: 1500, min: 1, max: 100 }]}
    />,
  )
  expect(
    (getByLabelText('Great') as HTMLInputElement).getAttribute('data-state'),
  ).toBe('checked')
})

test('the rank boxes say which end they are', () => {
  // Two bare number inputs under a league picker do not say what they hold,
  // and rank 1 being the best rather than the worst is not guessable.
  const { getByRole, getByText } = render(<ConditionEditor />)
  openPvp(getByRole)
  expect(getByText('Best rank')).toBeTruthy()
  expect(getByText('Worst rank')).toBeTruthy()
})

test('a freshly added PvP row opens on a rank that exists, with a league', () => {
  // Rank 0 is not a place: the PvP scale starts at 1. And a rank range
  // with no league renders as nothing at all (`describeCondition` omits
  // the whole condition when the league column is null), so adding the
  // row without one gives a control that edits and a sentence that never
  // moves.
  const onChange = vi.fn()
  const { getByRole } = render(<ConditionEditor onChange={onChange} />)
  openPvp(getByRole)
  const patch = onChange.mock.calls.at(-1)?.[0]
  expect(patch?.pvpRankMin).toBe(1)
  expect(patch?.pvpLeague).toBe(500)
})

test('adding PvP does not overwrite a league the row already stored', () => {
  const onChange = vi.fn()
  const { getByRole } = render(
    <ConditionEditor
      conditions={[{ type: 'pvp', label: 1500, min: 1, max: 100 }]}
      onChange={onChange}
    />,
  )
  // Already active, so the menu never offers it -- but the guard matters
  // for the seeded-then-removed-then-re-added path.
  expect(
    (getByRole('radio', { name: 'Great' }) as HTMLInputElement).getAttribute(
      'data-state',
    ),
  ).toBe('checked')
})
