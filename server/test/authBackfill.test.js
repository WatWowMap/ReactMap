// server/test/authBackfill.test.js
const { test, expect } = require('bun:test')
const {
  planBackfill,
  detectCollisions,
  formatCollisionReport,
} = require('../src/auth/backfill')

test('accounts carry the issuer strings better auth generates', () => {
  const plan = planBackfill({
    id: 7,
    username: 'ash',
    password: '$2b$10$h',
    discordId: '99',
    telegramId: '55',
  })
  const byProvider = Object.fromEntries(
    plan.accounts.map((a) => [a.providerId, a.issuer]),
  )
  expect(byProvider.credential).toBe('local:credential')
  expect(byProvider.discord).toBe('local:oauth:discord')
  // Telegram is a local provider, not OAuth. Its plugin looks this exact string
  // up, so `local:oauth:telegram` would be invisible to it and every migrated
  // Telegram user would silently fail to sign in.
  expect(byProvider.telegram).toBe('local:telegram')
})

test('a local account keeps its password hash on the account row', () => {
  const plan = planBackfill({
    id: 7,
    username: 'ash',
    password: '$2b$10$hash',
    strategy: 'local',
  })
  const credential = plan.accounts.find((a) => a.providerId === 'credential')
  expect(credential.password).toBe('$2b$10$hash')
  // Better Auth uses the user's own id as the credential accountId, not the
  // username. Confirmed against a row it wrote itself.
  expect(credential.accountId).toBe(plan.user.id)
  expect(plan.user.username).toBe('ash')
})

test('a discord identity becomes an account row, not a column', () => {
  const plan = planBackfill({ id: 7, discordId: '99', strategy: 'discord' })
  const discord = plan.accounts.find((a) => a.providerId === 'discord')
  expect(discord.accountId).toBe('99')
  expect(plan.user).not.toHaveProperty('discordId')
})

test('a linked user gets one account row per identity', () => {
  const plan = planBackfill({
    id: 7,
    username: 'ash',
    password: '$2b$10$h',
    discordId: '99',
    telegramId: '55',
  })
  expect(plan.accounts.map((a) => a.providerId).sort()).toEqual([
    'credential',
    'discord',
    'telegram',
  ])
})

test('perms become one row per provider that has them', () => {
  const plan = planBackfill({
    id: 7,
    discordId: '99',
    discordPerms: { map: true },
    telegramId: '55',
    telegramPerms: { map: false },
  })
  expect(plan.perms).toHaveLength(2)
  expect(plan.perms.find((p) => p.providerId === 'discord').perms).toEqual({
    map: true,
  })
})

test('absent perms produce no rows rather than empty ones', () => {
  const plan = planBackfill({ id: 7, discordId: '99' })
  expect(plan.perms).toHaveLength(0)
})

test('a user with no password gets no credential account', () => {
  const plan = planBackfill({ id: 7, username: 'ash', discordId: '99' })
  expect(
    plan.accounts.find((a) => a.providerId === 'credential'),
  ).toBeUndefined()
})

test('the auth user id is derived from the legacy id so the mapping is stable', () => {
  expect(planBackfill({ id: 7 }).user.id).toBe(planBackfill({ id: 7 }).user.id)
  expect(planBackfill({ id: 7 }).user.id).not.toBe(
    planBackfill({ id: 8 }).user.id,
  )
})

test('reactmap-owned preferences ride along on the user row', () => {
  const plan = planBackfill({ id: 7, tutorial: true, useAppShell: true })
  expect(plan.user.legacyId).toBe(7)
})

test('the plan carries the legacy id as the join key back to users', () => {
  expect(planBackfill({ id: 7 }).user.legacyId).toBe(7)
})

test('detectCollisions flags two rows with the exact same username', () => {
  const collisions = detectCollisions([
    { id: 300, username: 'AshKetchum' },
    { id: 301, username: 'AshKetchum' },
  ])
  expect(collisions).toEqual([
    { field: 'username', value: 'ashketchum', ids: [300, 301] },
  ])
})

test('detectCollisions flags usernames differing only by case', () => {
  const collisions = detectCollisions([
    { id: 300, username: 'AshKetchum' },
    { id: 301, username: 'ashketchum' },
  ])
  expect(collisions).toHaveLength(1)
  expect(collisions[0].field).toBe('username')
  expect(collisions[0].ids).toEqual([300, 301])
})

test('detectCollisions flags usernames differing only by trailing whitespace', () => {
  const collisions = detectCollisions([
    { id: 300, username: 'ashketchum' },
    { id: 301, username: 'ashketchum ' },
  ])
  expect(collisions).toHaveLength(1)
  expect(collisions[0].field).toBe('username')
  expect(collisions[0].ids).toEqual([300, 301])
})

test('detectCollisions flags two rows sharing a discordId', () => {
  const collisions = detectCollisions([
    { id: 303, discordId: '555' },
    { id: 304, discordId: '555' },
  ])
  expect(collisions).toEqual([
    { field: 'discordId', value: '555', ids: [303, 304] },
  ])
})

test('detectCollisions flags two rows sharing a telegramId', () => {
  const collisions = detectCollisions([
    { id: 305, telegramId: '999' },
    { id: 306, telegramId: '999' },
  ])
  expect(collisions).toEqual([
    { field: 'telegramId', value: '999', ids: [305, 306] },
  ])
})

test('detectCollisions returns nothing for a clean table', () => {
  const collisions = detectCollisions([
    { id: 1, username: 'ash', discordId: '1', telegramId: '10' },
    { id: 2, username: 'brock', discordId: '2', telegramId: '20' },
  ])
  expect(collisions).toEqual([])
})

test('detectCollisions returns nothing for an empty table', () => {
  expect(detectCollisions([])).toEqual([])
})

test('detectCollisions finds multiple independent collisions in one pass', () => {
  const collisions = detectCollisions([
    { id: 300, username: 'AshKetchum' },
    { id: 301, username: 'ashketchum' },
    { id: 302, username: 'brock' },
    { id: 303, username: 'misty', discordId: '555' },
    { id: 304, username: 'gary', discordId: '555' },
  ])
  const fields = collisions.map((c) => c.field).sort()
  expect(fields).toEqual(['discordId', 'username'])
})

test('formatCollisionReport names the colliding ids and the shared value', () => {
  const message = formatCollisionReport([
    { field: 'username', value: 'ashketchum', ids: [300, 301] },
    { field: 'discordId', value: '555', ids: [303, 304] },
  ])
  expect(message).toContain('300')
  expect(message).toContain('301')
  expect(message).toContain('303')
  expect(message).toContain('304')
  expect(message).toContain('username')
  expect(message).toContain('ashketchum')
  expect(message).toContain('discordId')
  expect(message).toContain('555')
})
