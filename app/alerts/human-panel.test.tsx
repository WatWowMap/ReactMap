import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { setupDom, teardownDom } from '../test-setup'
import type { HumanPanelProps } from './human-panel'
import { HumanPanel } from './human-panel'

beforeAll(setupDom)
afterAll(teardownDom)
afterEach(cleanup)

// Not the global `screen`: it snapshots `document` at import time, before
// `setupDom` runs in `beforeAll`, and throws on every query -- the queries
// `render()` returns need the DOM only once the test body runs.
function renderPanel(overrides: Partial<HumanPanelProps> = {}) {
  const props: HumanPanelProps = {
    human: {
      enabled: true,
      currentProfileNo: 1,
      latitude: null,
      longitude: null,
      areas: [],
    },
    profiles: [{ profileNo: 1, name: 'default' }],
    onSetEnabled: () => {},
    onSwitchProfile: () => {},
    onAddProfile: () => {},
    onDeleteProfile: () => {},
    onCopyProfileRules: () => {},
    ...overrides,
  }
  return render(<HumanPanel {...props} />)
}

test('the master switch reflects and toggles the human enabled flag', () => {
  const calls: boolean[] = []
  const { getByRole } = renderPanel({
    human: {
      enabled: true,
      currentProfileNo: 1,
      latitude: null,
      longitude: null,
      areas: [],
    },
    onSetEnabled: (enabled) => calls.push(enabled),
  })
  const toggle = getByRole('switch', { name: /alerts/i })
  expect(toggle.getAttribute('aria-checked')).toBe('true')
  fireEvent.click(toggle)
  expect(calls).toEqual([false])
})

test('picking a profile from the list switches to it', () => {
  const calls: number[] = []
  const { getByRole } = renderPanel({
    profiles: [
      { profileNo: 1, name: 'default' },
      { profileNo: 2, name: 'work' },
    ],
    onSwitchProfile: (profileNo) => calls.push(profileNo),
  })
  // Scoped to the listbox: a native `<option>` in the copy-rules selects
  // below also carries the "option" role and the same name, and an
  // unscoped query cannot tell the two apart.
  const list = getByRole('listbox', { name: 'Profiles' })
  fireEvent.click(within(list).getByRole('option', { name: 'work' }))
  expect(calls).toEqual([2])
})

test('the active profile is marked selected among the options', () => {
  const { getByRole } = renderPanel({
    human: {
      enabled: true,
      currentProfileNo: 2,
      latitude: null,
      longitude: null,
      areas: [],
    },
    profiles: [
      { profileNo: 1, name: 'default' },
      { profileNo: 2, name: 'work' },
    ],
  })
  const list = within(getByRole('listbox', { name: 'Profiles' }))
  expect(
    list.getByRole('option', { name: 'work' }).getAttribute('aria-selected'),
  ).toBe('true')
  expect(
    list.getByRole('option', { name: 'default' }).getAttribute('aria-selected'),
  ).toBe('false')
})

test('typing a name and adding creates a profile, then clears the field', () => {
  const calls: string[] = []
  const { getByRole } = renderPanel({
    onAddProfile: (name) => calls.push(name),
  })
  const input = getByRole('textbox', { name: /new profile name/i })
  fireEvent.change(input, { target: { value: 'work' } })
  fireEvent.click(getByRole('button', { name: /add profile/i }))
  expect(calls).toEqual(['work'])
  expect((input as HTMLInputElement).value).toBe('')
})

test('an empty or blank name is never sent', () => {
  const calls: string[] = []
  const { getByRole } = renderPanel({
    onAddProfile: (name) => calls.push(name),
  })
  fireEvent.click(getByRole('button', { name: /add profile/i }))
  const input = getByRole('textbox', { name: /new profile name/i })
  fireEvent.change(input, { target: { value: '   ' } })
  fireEvent.click(getByRole('button', { name: /add profile/i }))
  expect(calls).toEqual([])
})

test('deleting a profile asks for confirmation before calling back', async () => {
  // Deleting a profile is irreversible on Poracle's side, so the callback
  // fires only once someone confirms -- clicking "Delete" alone must not
  // touch anything.
  const calls: number[] = []
  const { getByRole, findByRole } = renderPanel({
    profiles: [
      { profileNo: 1, name: 'default' },
      { profileNo: 2, name: 'work' },
    ],
    onDeleteProfile: (profileNo) => calls.push(profileNo),
  })
  fireEvent.click(getByRole('button', { name: /delete profile work/i }))
  expect(calls).toEqual([])
  const dialog = await findByRole('alertdialog')
  fireEvent.click(within(dialog).getByRole('button', { name: /^delete$/i }))
  expect(calls).toEqual([2])
})

test('cancelling a profile delete never calls back', async () => {
  const calls: number[] = []
  const { getByRole, findByRole, queryByRole } = renderPanel({
    profiles: [
      { profileNo: 1, name: 'default' },
      { profileNo: 2, name: 'work' },
    ],
    onDeleteProfile: (profileNo) => calls.push(profileNo),
  })
  fireEvent.click(getByRole('button', { name: /delete profile work/i }))
  const dialog = await findByRole('alertdialog')
  fireEvent.click(within(dialog).getByRole('button', { name: /cancel/i }))
  expect(calls).toEqual([])
  expect(queryByRole('alertdialog')).toBeNull()
})

test('copying rules is offered only once there is more than one profile', () => {
  const { queryByRole } = renderPanel({
    profiles: [{ profileNo: 1, name: 'default' }],
  })
  expect(queryByRole('button', { name: /copy rules/i })).toBeNull()
})

test('the copy button starts disabled: nothing is selected as a destination yet', () => {
  // The bug this guards against: defaulting both selects to the same
  // profile made "click Copy rules without touching either dropdown" --
  // the single most likely first interaction with this control -- silently
  // delete every rule in the active profile, because Poracle's copy deletes
  // the destination before reading the source.
  const { getByRole } = renderPanel({
    profiles: [
      { profileNo: 1, name: 'default' },
      { profileNo: 2, name: 'work' },
    ],
  })
  expect(
    getByRole('button', { name: /copy rules/i }).hasAttribute('disabled'),
  ).toBe(true)
})

test('the destination list never offers the selected source, so a self-copy cannot be chosen', () => {
  const { getByRole } = renderPanel({
    profiles: [
      { profileNo: 1, name: 'default' },
      { profileNo: 2, name: 'work' },
    ],
  })
  const into = within(getByRole('combobox', { name: /copy rules into/i }))
  // Source defaults to the active profile (profileNo 1, "default"), so
  // "default" must not appear as a destination option.
  expect(into.queryByRole('option', { name: 'default' })).toBeNull()
  expect(into.getByRole('option', { name: 'work' })).toBeTruthy()
})

test('copying rules confirms, then names both the source and the destination, never a duplicate', async () => {
  const calls: { fromProfileNo: number; toProfileNo: number }[] = []
  const { getByRole, findByRole } = renderPanel({
    profiles: [
      { profileNo: 1, name: 'default' },
      { profileNo: 2, name: 'work' },
    ],
    onCopyProfileRules: (fromProfileNo, toProfileNo) =>
      calls.push({ fromProfileNo, toProfileNo }),
  })
  fireEvent.change(getByRole('combobox', { name: /copy rules into/i }), {
    target: { value: '2' },
  })
  const copyButton = getByRole('button', { name: /copy rules/i })
  expect(copyButton.hasAttribute('disabled')).toBe(false)
  fireEvent.click(copyButton)
  expect(calls).toEqual([])
  const dialog = await findByRole('alertdialog')
  fireEvent.click(within(dialog).getByRole('button', { name: /^copy rules$/i }))
  expect(calls).toEqual([{ fromProfileNo: 1, toProfileNo: 2 }])
})

test('changing the source clears a destination it would now collide with', () => {
  const { getByRole } = renderPanel({
    profiles: [
      { profileNo: 1, name: 'default' },
      { profileNo: 2, name: 'work' },
      { profileNo: 3, name: 'raids' },
    ],
  })
  fireEvent.change(getByRole('combobox', { name: /copy rules into/i }), {
    target: { value: '2' },
  })
  fireEvent.change(getByRole('combobox', { name: /copy rules from/i }), {
    target: { value: '2' },
  })
  // The destination that just became the new source is no longer a valid
  // choice, so the button goes back to disabled rather than silently
  // pointing at a self-copy.
  expect(
    getByRole('button', { name: /copy rules/i }).hasAttribute('disabled'),
  ).toBe(true)
})

test('arrow keys move focus between profile options, not just the active one', () => {
  // A `listbox`/`option` pair promises roving keyboard navigation; plain
  // buttons in a `div` don't get that for free without a handler wiring it
  // up. Only the active profile starts as a tab stop (`tabIndex={0}`).
  const { getByRole } = renderPanel({
    human: {
      enabled: true,
      currentProfileNo: 1,
      latitude: null,
      longitude: null,
      areas: [],
    },
    profiles: [
      { profileNo: 1, name: 'default' },
      { profileNo: 2, name: 'work' },
    ],
  })
  const list = within(getByRole('listbox', { name: 'Profiles' }))
  const defaultOption = list.getByRole('option', { name: 'default' })
  const workOption = list.getByRole('option', { name: 'work' })
  expect(defaultOption.getAttribute('tabindex')).toBe('0')
  expect(workOption.getAttribute('tabindex')).toBe('-1')

  defaultOption.focus()
  fireEvent.keyDown(defaultOption, { key: 'ArrowDown' })
  expect(document.activeElement).toBe(workOption)

  fireEvent.keyDown(workOption, { key: 'ArrowUp' })
  expect(document.activeElement).toBe(defaultOption)
})
