import { afterAll, beforeAll, expect, test } from 'bun:test'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { setupDom, teardownDom } from '../test-setup'
import { Hub } from './Hub'

beforeAll(setupDom)
afterAll(teardownDom)

test('links to the four primary surfaces without a session', () => {
  const { getAllByRole } = render(
    <MemoryRouter>
      <Hub />
    </MemoryRouter>,
  )
  const hrefs = getAllByRole('link').map((link) => link.getAttribute('href'))
  expect(hrefs).toEqual(['/map', '/filters', '/alerts', '/profile'])
})
