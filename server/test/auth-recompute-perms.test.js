// server/test/authRecomputePerms.test.js
const { test, expect } = require('bun:test')
const {
  computeUserPermsRows,
  derivedId,
} = require('../src/auth/recompute-perms')
const {
  recomputeUserPerms,
  buildComputers,
} = require('../src/auth/recompute-perms-on-sign-in')

test('a user with one linked account gets one perms row', async () => {
  const rows = await computeUserPermsRows(
    [{ userId: 'u1', providerId: 'discord', accountId: 'd1' }],
    { discord: async () => ({ map: true }) },
  )
  expect(rows).toEqual([
    {
      id: derivedId('u1', 'discord'),
      userId: 'u1',
      providerId: 'discord',
      perms: { map: true },
    },
  ])
})

test('a user with two linked accounts gets one row per provider', async () => {
  const rows = await computeUserPermsRows(
    [
      { userId: 'u1', providerId: 'discord', accountId: 'd1' },
      { userId: 'u1', providerId: 'telegram', accountId: 't1' },
    ],
    {
      discord: async () => ({ map: true }),
      telegram: async () => ({ map: false, admin: true }),
    },
  )
  expect(rows.map((r) => r.providerId).sort()).toEqual(['discord', 'telegram'])
  expect(rows.find((r) => r.providerId === 'telegram').perms).toEqual({
    map: false,
    admin: true,
  })
})

test('a user with no linked accounts gets no rows, and no error', async () => {
  const rows = await computeUserPermsRows([], {
    discord: async () => ({ map: true }),
  })
  expect(rows).toEqual([])
})

test('a provider with no configured client is skipped, not errored', async () => {
  const rows = await computeUserPermsRows(
    [{ userId: 'u1', providerId: 'discord', accountId: 'd1' }],
    {},
  )
  expect(rows).toEqual([])
})

test('a compute function resolving to nothing writes no row for that account', async () => {
  const rows = await computeUserPermsRows(
    [{ userId: 'u1', providerId: 'discord', accountId: 'd1' }],
    { discord: async () => null },
  )
  expect(rows).toEqual([])
})

test('the same user and provider always derive the same id, so a recompute updates', () => {
  expect(derivedId('u1', 'discord')).toBe(derivedId('u1', 'discord'))
  expect(derivedId('u1', 'discord')).not.toBe(derivedId('u1', 'telegram'))
})

test('recomputeUserPerms loads accounts, computes, and upserts', async () => {
  let upserted = null
  await recomputeUserPerms('u1', {
    getAccounts: async () => [
      { userId: 'u1', providerId: 'discord', accountId: 'd1' },
    ],
    computers: { discord: async () => ({ map: true }) },
    upsert: async (rows) => {
      upserted = rows
    },
  })
  expect(upserted).toEqual([
    {
      id: derivedId('u1', 'discord'),
      userId: 'u1',
      providerId: 'discord',
      perms: { map: true },
    },
  ])
})

test('recomputeUserPerms upserts nothing for a user with no linked accounts', async () => {
  let upserted = null
  await recomputeUserPerms('u1', {
    getAccounts: async () => [],
    computers: {},
    upsert: async (rows) => {
      upserted = rows
    },
  })
  expect(upserted).toEqual([])
})

test('buildComputers only maps providers whose client is registered', () => {
  const computers = buildComputers({
    discord: { strategy: { type: 'discord' } },
  })
  expect(Object.keys(computers)).toEqual(['discord'])
})

test('buildComputers maps to nothing when no auth clients are registered', () => {
  expect(buildComputers({})).toEqual({})
  expect(buildComputers(undefined)).toEqual({})
})
