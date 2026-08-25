const { test, expect } = require('bun:test')
const {
  fetchGuildMemberRoles,
  fetchDiscordGuildResults,
} = require('../src/auth/discord-roles')

const fakeClient = ({ guild, fetchGuildError, member, fetchMemberError }) => ({
  guilds: {
    cache: { get: () => undefined },
    fetch: async (id) => {
      if (fetchGuildError) throw fetchGuildError
      return (
        guild || {
          id,
          name: `guild-${id}`,
          members: fakeMembers({ member, fetchMemberError }),
        }
      )
    },
  },
})

const fakeMembers = ({ member, fetchMemberError }) => ({
  fetch: async () => {
    if (fetchMemberError) throw fetchMemberError
    return member
  },
})

test('bot not configured (null client) returns unknown, no network call attempted', async () => {
  const result = await fetchGuildMemberRoles(null, 'g1', 'u1')
  expect(result).toEqual({ status: 'unknown', reason: 'bot_not_configured' })
})

test('a guild fetch that throws (bot cannot reach the guild) returns unknown', async () => {
  const client = fakeClient({ fetchGuildError: new Error('ECONNREFUSED') })
  const result = await fetchGuildMemberRoles(client, 'g1', 'u1')
  expect(result).toEqual({ status: 'unknown', reason: 'guild_unreachable' })
})

test('a member not found (Discord "Unknown Member", code 10007) returns not_member', async () => {
  const error = Object.assign(new Error('Unknown Member'), { code: 10007 })
  const client = fakeClient({ fetchMemberError: error })
  const result = await fetchGuildMemberRoles(client, 'g1', 'u1')
  expect(result).toEqual({ status: 'not_member' })
})

test('a rate-limited member fetch (code 429) returns unknown with reason rate_limited', async () => {
  const error = Object.assign(new Error('rate limited'), { code: 429 })
  const client = fakeClient({ fetchMemberError: error })
  const result = await fetchGuildMemberRoles(client, 'g1', 'u1')
  expect(result).toEqual({ status: 'unknown', reason: 'rate_limited' })
})

test('any other member-fetch failure returns unknown with reason fetch_failed', async () => {
  const error = new Error('something else')
  const client = fakeClient({ fetchMemberError: error })
  const result = await fetchGuildMemberRoles(client, 'g1', 'u1')
  expect(result).toEqual({ status: 'unknown', reason: 'fetch_failed' })
})

test('a real member returns their roles and the guild name', async () => {
  const member = { roles: { cache: [{ id: 'r1' }, { id: 'r2' }] } }
  const client = fakeClient({ member })
  const result = await fetchGuildMemberRoles(client, 'g1', 'u1')
  expect(result).toEqual({
    status: 'member',
    roles: ['r1', 'r2'],
    guildName: 'guild-g1',
  })
})

test('fetchDiscordGuildResults fetches every deduplicated guild id and keys results by guild id', async () => {
  const member = { roles: { cache: [] } }
  const client = fakeClient({ member })
  const results = await fetchDiscordGuildResults(
    client,
    ['g1', 'g2', 'g1'],
    'u1',
  )
  expect(Object.keys(results).sort()).toEqual(['g1', 'g2'])
  expect(results.g1.status).toBe('member')
  expect(results.g2.status).toBe('member')
})

test('fetchDiscordGuildResults with a null client reports every guild as unknown', async () => {
  const results = await fetchDiscordGuildResults(null, ['g1', 'g2'], 'u1')
  expect(results).toEqual({
    g1: { status: 'unknown', reason: 'bot_not_configured' },
    g2: { status: 'unknown', reason: 'bot_not_configured' },
  })
})
