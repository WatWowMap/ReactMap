// server/test/authDiscordGuilds.test.js
const { test, expect } = require('bun:test')
const { fetchDiscordGuilds } = require('../src/auth/discord-guilds')

test('no access token returns null guilds with reason no_token, no fetch attempted', async () => {
  let called = false
  const result = await fetchDiscordGuilds(null, async () => {
    called = true
    return new Response('[]')
  })
  expect(result).toEqual({ guilds: null, reason: 'no_token' })
  expect(called).toBe(false)
})

test('a network failure (Discord unreachable) returns null guilds with reason unreachable', async () => {
  const result = await fetchDiscordGuilds('tok', async () => {
    throw new Error('ECONNREFUSED')
  })
  expect(result).toEqual({ guilds: null, reason: 'unreachable' })
})

test('a 401 (expired/revoked token) returns null guilds with reason unauthorized', async () => {
  const result = await fetchDiscordGuilds(
    'tok',
    async () => new Response('{}', { status: 401 }),
  )
  expect(result).toEqual({ guilds: null, reason: 'unauthorized' })
})

test('a 429 (rate limited) returns null guilds with reason rate_limited', async () => {
  const result = await fetchDiscordGuilds(
    'tok',
    async () => new Response('{}', { status: 429 }),
  )
  expect(result).toEqual({ guilds: null, reason: 'rate_limited' })
})

test('any other non-ok status returns null guilds with the status in the reason', async () => {
  const result = await fetchDiscordGuilds(
    'tok',
    async () => new Response('{}', { status: 500 }),
  )
  expect(result).toEqual({ guilds: null, reason: 'http_500' })
})

test('a malformed body returns null guilds with reason invalid_response', async () => {
  const result = await fetchDiscordGuilds(
    'tok',
    async () => new Response('not json'),
  )
  expect(result).toEqual({ guilds: null, reason: 'invalid_response' })
})

test('a body that is not an array returns null guilds with reason invalid_response', async () => {
  const result = await fetchDiscordGuilds(
    'tok',
    async () => new Response(JSON.stringify({ not: 'an array' })),
  )
  expect(result).toEqual({ guilds: null, reason: 'invalid_response' })
})

test('a successful response maps to a plain id/name guild list', async () => {
  const result = await fetchDiscordGuilds(
    'tok',
    async () =>
      new Response(
        JSON.stringify([
          { id: 'g1', name: 'Guild One', extra: 'dropped' },
          { id: 'g2', name: 'Guild Two' },
        ]),
      ),
  )
  expect(result).toEqual({
    guilds: [
      { id: 'g1', name: 'Guild One' },
      { id: 'g2', name: 'Guild Two' },
    ],
  })
})
