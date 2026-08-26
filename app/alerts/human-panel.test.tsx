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

test('deleting a profile calls back with its number', () => {
  const calls: number[] = []
  const { getByRole } = renderPanel({
    profiles: [
      { profileNo: 1, name: 'default' },
      { profileNo: 2, name: 'work' },
    ],
    onDeleteProfile: (profileNo) => calls.push(profileNo),
  })
  fireEvent.click(getByRole('button', { name: /delete profile work/i }))
  expect(calls).toEqual([2])
})

test('copying rules is offered only once there is more than one profile', () => {
  const { queryByRole } = renderPanel({
    profiles: [{ profileNo: 1, name: 'default' }],
  })
  expect(queryByRole('button', { name: /copy rules/i })).toBeNull()
})

test('copying rules names both the source and the destination, never a duplicate', () => {
  const calls: { fromProfileNo: number; toProfileNo: number }[] = []
  const { getByRole } = renderPanel({
    profiles: [
      { profileNo: 1, name: 'default' },
      { profileNo: 2, name: 'work' },
    ],
    onCopyProfileRules: (fromProfileNo, toProfileNo) =>
      calls.push({ fromProfileNo, toProfileNo }),
  })
  fireEvent.change(getByRole('combobox', { name: /copy rules from/i }), {
    target: { value: '1' },
  })
  fireEvent.change(getByRole('combobox', { name: /copy rules into/i }), {
    target: { value: '2' },
  })
  fireEvent.click(getByRole('button', { name: /copy rules/i }))
  expect(calls).toEqual([{ fromProfileNo: 1, toProfileNo: 2 }])
})
