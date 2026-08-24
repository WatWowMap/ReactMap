import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { cleanup, render, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { setupDom, teardownDom } from '../test-setup'
import { Hub } from './hub'

beforeAll(setupDom)
afterAll(teardownDom)

// Every render is appended to the same document and stays there, so without
// this each test sees the leftovers of the ones before it. The bottom nav
// renders a link labelled Filters as well, so a stale render from either file
// can make the other's query ambiguous.
afterEach(cleanup)

test('links to the four primary surfaces without a session', () => {
  const { container } = render(
    <MemoryRouter>
      <Hub />
    </MemoryRouter>,
  )
  const hrefs = within(container)
    .getAllByRole('link')
    .map((link) => link.getAttribute('href'))
  expect(hrefs).toEqual(['/map', '/filters', '/alerts', '/profile'])
})
