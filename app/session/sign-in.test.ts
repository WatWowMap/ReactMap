import { afterEach, expect, test } from 'bun:test'
import { providerLabel, signInWith, signOut } from './sign-in'

const realFetch = globalThis.fetch

afterEach(() => {
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

test('sign-in sends the browser to the URL the server hands back', async () => {
  const calls = respondWith({ url: 'https://discord.com/oauth2/authorize?x=1' })
  let sentTo = ''

  await signInWith('discord', { navigate: (url) => (sentTo = url) })

  expect(calls[0]?.url).toBe('/api/auth/sign-in/social')
  expect(JSON.parse(calls[0]?.init.body)).toEqual({
    provider: 'discord',
    callbackURL: '/',
  })
  expect(sentTo).toBe('https://discord.com/oauth2/authorize?x=1')
})

test('a caller can choose where the provider returns them', async () => {
  respondWith({ url: 'https://discord.com/oauth2/authorize' })
  const calls = respondWith({ url: 'https://discord.com/oauth2/authorize' })

  await signInWith('discord', { navigate: () => {}, callbackURL: '/alerts' })

  expect(JSON.parse(calls[0]?.init.body).callbackURL).toBe('/alerts')
})

test('a refused sign-in throws rather than navigating nowhere', async () => {
  respondWith({ error: 'nope' }, 500)
  let sentTo = ''

  await expect(
    signInWith('discord', { navigate: (url) => (sentTo = url) }),
  ).rejects.toThrow(/could not start sign-in/i)
  expect(sentTo).toBe('')
})

test('a 200 carrying no URL throws instead of looking like it worked', async () => {
  // Better Auth answers this way when the provider is not configured on the
  // server. A button that silently does nothing is the worse failure.
  respondWith({})
  let sentTo = ''

  await expect(
    signInWith('discord', { navigate: (url) => (sentTo = url) }),
  ).rejects.toThrow(/no sign-in url/i)
  expect(sentTo).toBe('')
})

test('sign-out posts and then lands on the anonymous view', async () => {
  const calls = respondWith({})
  let sentTo = ''

  await signOut({ navigate: (url) => (sentTo = url) })

  expect(calls[0]?.url).toBe('/api/auth/sign-out')
  expect(calls[0]?.init.method).toBe('POST')
  expect(sentTo).toBe('/')
})

test('a failed sign-out throws rather than pretending the session ended', async () => {
  respondWith({}, 500)
  let sentTo = ''

  await expect(signOut({ navigate: (url) => (sentTo = url) })).rejects.toThrow(
    /could not sign out/i,
  )
  expect(sentTo).toBe('')
})

test('providers read as names, and an unknown one falls back to itself', () => {
  expect(providerLabel('discord')).toBe('Discord')
  expect(providerLabel('local')).toBe('a username and password')
  expect(providerLabel('something-new')).toBe('something-new')
})
