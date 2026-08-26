import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { cleanup, fireEvent, render } from '@testing-library/react'
import type { AlertRow } from '../rules/poracle-vocabulary'
import { setupDom, teardownDom } from '../test-setup'
import { AlertEditor } from './alert-editor'

beforeAll(setupDom)
afterAll(teardownDom)
afterEach(cleanup)

const BASE: AlertRow = {
  uid: 7,
  profileNo: 1,
  pokemonId: 149,
  form: 0,
  costume: 0,
  ping: '',
  clean: false,
  distance: 0,
  template: '',
  overrideLocationLabel: null,
  ivMin: 100,
  ivMax: 100,
  cpMin: null,
  cpMax: null,
  levelMin: null,
  levelMax: null,
  atkMin: null,
  atkMax: null,
  defMin: null,
  defMax: null,
  staMin: null,
  staMax: null,
  gender: null,
  weightMin: null,
  weightMax: null,
  minTime: null,
  rarityMin: null,
  rarityMax: null,
  sizeMin: null,
  sizeMax: null,
  pvpLeague: null,
  pvpRankBest: null,
  pvpRankWorst: null,
  pvpMinCp: null,
  pvpCap: null,
  description: null,
}

test("seeds the sheet from the alert, described through Poracle's vocabulary", () => {
  const { getByText } = render(
    <AlertEditor alert={BASE} onSave={() => {}} onDelete={() => {}} />,
  )
  expect(getByText('IV')).toBeTruthy()
})

test('saving reports the seeded condition plus a newly added one', () => {
  // Add a condition rather than typing into one: `fireEvent.change` does
  // not drive React's controlled-input path under this DOM shim -- see
  // `filters-page.test.tsx`'s same note.
  const saved: unknown[] = []
  const { getByRole } = render(
    <AlertEditor
      alert={BASE}
      onSave={(patch) => saved.push(patch)}
      onDelete={() => {}}
    />,
  )
  fireEvent.click(getByRole('button', { name: '+' }))
  fireEvent.click(getByRole('option', { name: /^level$/i }))
  fireEvent.click(getByRole('button', { name: /save/i }))
  // `ConditionEditor` reports the whole active-fields object on every
  // change, not a delta -- the IV bounds ride along because they were
  // already seeded from the alert, and `levelMin` is `addCondition`'s
  // own starting value for a freshly added row.
  expect(saved).toEqual([{ ivMin: 100, ivMax: 100, levelMin: 0 }])
})

test('saving with no edits still lets the caller commit an unchanged patch', () => {
  const saved: unknown[] = []
  const { getByRole } = render(
    <AlertEditor
      alert={BASE}
      onSave={(patch) => saved.push(patch)}
      onDelete={() => {}}
    />,
  )
  fireEvent.click(getByRole('button', { name: /save/i }))
  expect(saved).toEqual([{}])
})

test('delete calls back without touching the draft', () => {
  const deletes: number[] = []
  const { getByRole } = render(
    <AlertEditor
      alert={BASE}
      onSave={() => {}}
      onDelete={() => deletes.push(BASE.uid)}
    />,
  )
  fireEvent.click(getByRole('button', { name: /delete/i }))
  expect(deletes).toEqual([7])
})

test('never renders the enabled switch -- Poracle has no per-alert column for it', () => {
  const { queryByRole } = render(
    <AlertEditor alert={BASE} onSave={() => {}} onDelete={() => {}} />,
  )
  expect(queryByRole('switch', { name: /enabled/i })).toBeNull()
})

test('a seeded value condition (minTime) renders its current value, not a blank row', () => {
  const { getByDisplayValue } = render(
    <AlertEditor
      alert={{ ...BASE, minTime: 300 }}
      onSave={() => {}}
      onDelete={() => {}}
    />,
  )
  expect(getByDisplayValue('300')).toBeTruthy()
})

test('adding a value condition through the + menu reports its starting value', () => {
  const saved: unknown[] = []
  const { getByRole } = render(
    <AlertEditor
      alert={BASE}
      onSave={(patch) => saved.push(patch)}
      onDelete={() => {}}
    />,
  )
  fireEvent.click(getByRole('button', { name: '+' }))
  fireEvent.click(getByRole('option', { name: /time remaining/i }))
  fireEvent.click(getByRole('button', { name: /save/i }))
  expect(saved).toEqual([{ ivMin: 100, ivMax: 100, minTime: 0 }])
})
