import { afterAll, afterEach, beforeAll, expect, mock, test } from 'bun:test'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { setupDom, teardownDom } from '../test-setup'
import { Profile } from './Profile'

beforeAll(setupDom)
afterAll(teardownDom)

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

test('renders a loading affordance while the session resolves', () => {
  globalThis.fetch = mock(
    () => new Promise(() => {}),
  ) as unknown as typeof fetch
  const { getByText } = render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>,
  )
  expect(getByText('Loading...')).toBeTruthy()
})

test('prompts to sign in when logged out, without account details', async () => {
  globalThis.fetch = mock(
    async () =>
      new Response(JSON.stringify({ user: { loggedIn: false, perms: {} } }), {
        status: 200,
      }),
  ) as unknown as typeof fetch
  const { findByText, queryByText } = render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>,
  )
  expect(await findByText('Sign in to see your profile.')).toBeTruthy()
  expect(queryByText('Loading...')).toBeNull()
})

test('renders the username when logged in', async () => {
  globalThis.fetch = mock(
    async () =>
      new Response(
        JSON.stringify({
          user: { loggedIn: true, username: 'ash', perms: { map: true } },
        }),
        { status: 200 },
      ),
  ) as unknown as typeof fetch
  const { findByText } = render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>,
  )
  expect(await findByText('ash')).toBeTruthy()
})
