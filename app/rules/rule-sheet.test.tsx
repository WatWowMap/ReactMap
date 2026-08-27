import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { setupDom, teardownDom } from '../test-setup'
import type { RuleSheetProps } from './rule-sheet'
import { RuleSheet } from './rule-sheet'

beforeAll(setupDom)
afterAll(teardownDom)
afterEach(cleanup)

function renderSheet(props: Partial<RuleSheetProps>) {
  return render(<RuleSheet speciesId={null} {...props} />)
}

test('the exclusion control appears only when the subject is Any Pokémon', () => {
  const specific = renderSheet({ speciesId: 147 })
  expect(specific.queryByText(/except/i)).toBeNull()
  specific.unmount()

  const any = renderSheet({ speciesId: null })
  expect(any.getByText(/except/i)).toBeTruthy()
})

test('a specific-species sheet still edits its conditions', () => {
  // The exclusion picker is the only thing gated on subject -- everything
  // else in the sheet applies to a one-species rule exactly as it does to
  // an Any-Pokémon one. This used to witness that through the PvP league
  // control, which the sheet rendered whether or not the rule used it;
  // PvP is opt-in now like every other condition, so the witness is the
  // add-a-condition path itself.
  const { getAllByRole, getByRole } = renderSheet({ speciesId: 147 })
  fireEvent.click(getByRole('button', { name: /add a condition/i }))
  fireEvent.click(getByRole('option', { name: /rank/i }))
  expect(getAllByRole('radio', { name: /little|great|ultra/i })).toHaveLength(3)
})

test('the sheet can switch a rule off, and reports it as a patch', () => {
  let patch: unknown = null
  const { getByRole } = renderSheet({
    speciesId: 147,
    enabled: true,
    onChange: (next) => {
      patch = next
    },
  })
  fireEvent.click(getByRole('switch', { name: /enabled/i }))
  expect(patch).toEqual({ enabled: false })
})
