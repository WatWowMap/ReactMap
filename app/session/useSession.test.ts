import { afterEach, expect, mock, test } from 'bun:test'
import { fetchSession } from './useSession'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

test('returns the parsed payload on success', async () => {
  globalThis.fetch = mock(
    async () =>
      new Response(JSON.stringify({ user: { loggedIn: true, perms: {} } }), {
        status: 200,
      }),
  ) as unknown as typeof fetch
  const settings = await fetchSession()
  expect(settings.user.loggedIn).toBe(true)
})

test('throws with the status when the request fails', async () => {
  globalThis.fetch = mock(
    async () => new Response('nope', { status: 500 }),
  ) as unknown as typeof fetch
  expect(fetchSession()).rejects.toThrow('500')
})
