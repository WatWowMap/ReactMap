import { afterAll, afterEach, beforeAll, expect, test, vi } from 'bun:test'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { Button } from '../components/ui/button'
import { setupDom, teardownDom } from '../test-setup'
import type { RulePatch } from './rules-query'
import { SplitWarning } from './split-warning'

beforeAll(setupDom)
afterAll(teardownDom)
afterEach(cleanup)

/**
 * The field being changed is never split-warning.tsx's concern -- it
 * only gates whatever `attemptChange` a caller wires up. A single
 * "Extra large" button standing in for the sheet's real appearance
 * control is enough to exercise the gate without building that control
 * here too.
 *
 * Returns the render result's own bound queries rather than the global
 * `screen` -- `@testing-library/dom`'s `screen` snapshots `document` at
 * import time, before happy-dom is registered in this file's `beforeAll`,
 * and throws on every query as a result. `species-picker.test.tsx` hits
 * the same thing and sidesteps it the same way.
 */
function renderSheetForGroup({
  name,
  size,
  editing,
  onCommit,
}: {
  name: string
  size: number
  editing: string
  onCommit?: (patch: RulePatch) => void
}) {
  return render(
    <SplitWarning
      groupSize={size}
      editingLabel={editing}
      {...(onCommit ? { onCommit } : {})}
    >
      {(attemptChange) => (
        <>
          <span>{name}</span>
          <Button onClick={() => attemptChange({ size: 'xl' })}>
            Extra large
          </Button>
        </>
      )}
    </SplitWarning>,
  )
}

test('changing a condition on a grouped card warns before committing', () => {
  const { getByRole, getByText } = renderSheetForGroup({
    name: 'Rare spawns',
    size: 25,
    editing: 'Larvitar',
  })
  fireEvent.click(getByRole('button', { name: /extra large/i }))
  expect(
    getByText('This will separate Larvitar from the other 24.'),
  ).toBeTruthy()
})

test('cancelling the split leaves every row unchanged', () => {
  const onCommit = vi.fn()
  const { getByRole } = renderSheetForGroup({
    name: 'Rare spawns',
    size: 25,
    editing: 'Larvitar',
    onCommit,
  })
  fireEvent.click(getByRole('button', { name: /extra large/i }))
  fireEvent.click(getByRole('button', { name: /cancel/i }))
  expect(onCommit).not.toHaveBeenCalled()
})

test('confirming the split commits the pending change exactly once', () => {
  const onCommit = vi.fn()
  const { getByRole } = renderSheetForGroup({
    name: 'Rare spawns',
    size: 25,
    editing: 'Larvitar',
    onCommit,
  })
  fireEvent.click(getByRole('button', { name: /extra large/i }))
  fireEvent.click(getByRole('button', { name: /^separate$/i }))
  expect(onCommit).toHaveBeenCalledTimes(1)
  expect(onCommit).toHaveBeenCalledWith({ size: 'xl' })
})

test('editing a group of one does not warn', () => {
  const onCommit = vi.fn()
  const { getByRole, queryByRole } = renderSheetForGroup({
    name: 'Everything',
    size: 1,
    editing: 'Any Pokémon',
    onCommit,
  })
  fireEvent.click(getByRole('button', { name: /extra large/i }))
  // Nothing to separate from, so the change applies straight away.
  expect(queryByRole('alertdialog')).toBeNull()
  expect(onCommit).toHaveBeenCalledTimes(1)
})
