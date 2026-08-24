import { afterAll, beforeAll, expect, test } from 'bun:test'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { setupDom, teardownDom } from '../test-setup'
import { BottomNav } from './BottomNav'

// `@testing-library/dom`'s `screen` singleton snapshots `document` the
// moment the module is first imported (dist/screen.js), so it only works
// when a global document exists before any test file's imports run — which
// means registering it process-wide via bunfig's preload, for every
// workspace in this monorepo. That broke unrelated suites elsewhere (see
// test-setup.ts). Using the queries `render` returns, bound to its own
// container, needs the DOM only once the test body actually runs, so
// registering it here in beforeAll, scoped to this file, is enough.
beforeAll(setupDom)
afterAll(teardownDom)

test('shows the four primary destinations in order', () => {
  const { getAllByRole } = render(
    <MemoryRouter initialEntries={['/map']}>
      <BottomNav />
    </MemoryRouter>,
  )
  const labels = getAllByRole('link').map((link) => link.textContent)
  expect(labels).toEqual(['Map', 'Filters', 'Alerts', 'Me'])
})

test('marks the active destination for assistive tech', () => {
  const { getByRole } = render(
    <MemoryRouter initialEntries={['/filters']}>
      <BottomNav />
    </MemoryRouter>,
  )
  const active = getByRole('link', { name: 'Filters' })
  expect(active.getAttribute('aria-current')).toBe('page')
})
