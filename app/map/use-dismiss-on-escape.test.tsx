import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { cleanup, render } from '@testing-library/react'
import { setupDom, teardownDom } from '../test-setup'
import { useDismissOnEscape } from './use-dismiss-on-escape'

beforeAll(setupDom)
afterAll(teardownDom)
afterEach(cleanup)

function Harness({
  active,
  onDismiss,
}: {
  active: boolean
  onDismiss: () => void
}) {
  useDismissOnEscape(active, onDismiss)
  return <div>harness</div>
}

const pressEscape = () => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
}

test('dismisses on escape while active', () => {
  let count = 0
  render(<Harness active onDismiss={() => (count += 1)} />)
  pressEscape()
  expect(count).toBe(1)
})

test('does nothing while inactive', () => {
  let count = 0
  render(<Harness active={false} onDismiss={() => (count += 1)} />)
  pressEscape()
  expect(count).toBe(0)
})

test('ignores other keys', () => {
  let count = 0
  render(<Harness active onDismiss={() => (count += 1)} />)
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
  expect(count).toBe(0)
})

test('stops listening once unmounted', () => {
  let count = 0
  const { unmount } = render(<Harness active onDismiss={() => (count += 1)} />)
  unmount()
  pressEscape()
  // A listener left on document survives navigation and fires against a
  // component that no longer exists, which is silent until it throws.
  expect(count).toBe(0)
})
