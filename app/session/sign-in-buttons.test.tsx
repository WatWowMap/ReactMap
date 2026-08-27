import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { setupDom, teardownDom } from '../test-setup'
import { SignInButtons, SignOutButton } from './sign-in-buttons'

beforeAll(setupDom)
afterAll(teardownDom)

const realFetch = globalThis.fetch

afterEach(async () => {
  // React can schedule after teardown and throw into the next test.
  await new Promise((resolve) => setTimeout(resolve, 0))
  cleanup()
  globalThis.fetch = realFetch
})

function respondWith(body: unknown, status = 200) {
  const calls: { url: string; init: any }[] = []
  globalThis.fetch = (async (url: any, init: any) => {
    calls.push({ url: String(url), init })
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as any
  return calls
}

test('a button appears per method the server named, and none it did not', () => {
  const { getByRole, queryByRole } = render(
    <SignInButtons methods={['discord']} navigate={() => {}} />,
  )
  expect(getByRole('button', { name: /sign in with discord/i })).toBeTruthy()
  expect(queryByRole('button', { name: /telegram/i })).toBeNull()
})

test('several methods each get their own button', () => {
  const { getByRole } = render(
    <SignInButtons methods={['discord', 'telegram']} navigate={() => {}} />,
  )
  expect(getByRole('button', { name: /discord/i })).toBeTruthy()
  expect(getByRole('button', { name: /telegram/i })).toBeTruthy()
})

test('no configured method says so rather than rendering nothing', () => {
  // An instance can run entirely on alwaysEnabledPerms. Silence would read
  // as a broken page.
  const { getByText, queryByRole } = render(
    <SignInButtons methods={[]} navigate={() => {}} />,
  )
  expect(getByText(/no sign-in configured/i)).toBeTruthy()
  expect(queryByRole('button')).toBeNull()
})

test('clicking sends the browser where the server said', async () => {
  respondWith({ url: 'https://discord.com/oauth2/authorize?x=1' })
  let sentTo = ''
  const { getByRole } = render(
    <SignInButtons methods={['discord']} navigate={(url) => (sentTo = url)} />,
  )

  fireEvent.click(getByRole('button', { name: /discord/i }))

  await waitFor(() =>
    expect(sentTo).toBe('https://discord.com/oauth2/authorize?x=1'),
  )
})

test('a refused sign-in shows why instead of doing nothing', async () => {
  respondWith({ error: 'nope' }, 500)
  const { getByRole } = render(
    <SignInButtons methods={['discord']} navigate={() => {}} />,
  )

  fireEvent.click(getByRole('button', { name: /discord/i }))

  const alert = await waitFor(() => getByRole('alert'))
  expect(alert.textContent).toMatch(/could not start sign-in/i)
})

test('the button comes back after a failure, so it can be retried', async () => {
  respondWith({}, 500)
  const { getByRole } = render(
    <SignInButtons methods={['discord']} navigate={() => {}} />,
  )

  fireEvent.click(getByRole('button', { name: /discord/i }))
  await waitFor(() => getByRole('alert'))

  expect(
    (getByRole('button', { name: /discord/i }) as HTMLButtonElement).disabled,
  ).toBe(false)
})

test('signing out posts and lands on the anonymous view', async () => {
  const calls = respondWith({})
  let sentTo = ''
  const { getByRole } = render(
    <SignOutButton navigate={(url) => (sentTo = url)} />,
  )

  fireEvent.click(getByRole('button', { name: /sign out/i }))

  await waitFor(() => expect(sentTo).toBe('/'))
  expect(calls[0]?.url).toBe('/api/auth/sign-out')
})

test('a failed sign-out says so rather than implying the session ended', async () => {
  respondWith({}, 500)
  let sentTo = ''
  const { getByRole } = render(
    <SignOutButton navigate={(url) => (sentTo = url)} />,
  )

  fireEvent.click(getByRole('button', { name: /sign out/i }))

  const alert = await waitFor(() => getByRole('alert'))
  expect(alert.textContent).toMatch(/could not sign out/i)
  expect(sentTo).toBe('')
})
