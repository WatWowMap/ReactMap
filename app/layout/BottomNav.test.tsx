import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { cleanup, render, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { setupDom, teardownDom } from '../test-setup'
import { BottomNav } from './BottomNav'

// `@testing-library/dom`'s `screen` singleton snapshots `document` the
// moment the module is first imported (dist/screen.js), so it only works
// when a global document exists before any test file's imports run — which
// means registering it process-wide via bunfig's preload, for every
// workspace in this monorepo. That broke unrelated suites elsewhere (see
// test-setup.ts). Using the queries `render` returns needs the DOM only once
// the test body actually runs, so registering it here in beforeAll, scoped to
// this file, is enough.
beforeAll(setupDom)
afterAll(teardownDom)

// Every render is appended to the same document and stays there, so without
// this each test sees the leftovers of the ones before it.
afterEach(cleanup)

// Queries are scoped to the container this render owns rather than the whole
// body. The hub renders a link labelled Filters too, so a document-wide query
// finds more than one and getByRole throws for being ambiguous. Whether that
// happened depended on which files had already run, which is why this passed
// locally and failed in CI.
test('shows the four primary destinations in order', () => {
  const { container } = render(
    <MemoryRouter initialEntries={['/map']}>
      <BottomNav />
    </MemoryRouter>,
  )
  const labels = within(container)
    .getAllByRole('link')
    .map((link) => link.textContent)
  expect(labels).toEqual(['Map', 'Filters', 'Alerts', 'Me'])
})

test('marks the active destination for assistive tech', () => {
  const { container } = render(
    <MemoryRouter initialEntries={['/filters']}>
      <BottomNav />
    </MemoryRouter>,
  )
  const active = within(container).getByRole('link', { name: 'Filters' })
  expect(active.getAttribute('aria-current')).toBe('page')
})
