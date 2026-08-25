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

test('buildComputers only maps providers whose strategy is enabled', () => {
  const computers = buildComputers({
    strategies: [{ type: 'discord', enabled: true }],
  })
  expect(Object.keys(computers)).toEqual(['discord'])
})

test('buildComputers maps to nothing when no strategy is enabled', () => {
  expect(buildComputers({ strategies: [] })).toEqual({})
  expect(
    buildComputers({
      strategies: [
        { type: 'discord', enabled: false },
        { type: 'telegram', enabled: false },
      ],
    }),
  ).toEqual({})
})

test('buildComputers registers no credential computer -- see recomputePermsOnSignIn.js for why', () => {
  const computers = buildComputers({
    strategies: [
      { type: 'discord', enabled: true },
      { type: 'telegram', enabled: true, botToken: 't', groups: [] },
      { type: 'local', enabled: true },
    ],
  })
  expect(Object.keys(computers).sort()).toEqual(['discord', 'telegram'])
})

test("buildComputers' discord computer fetches guild results via the bot client and computes perms, skipping the row when the bot cannot resolve a relevant guild", async () => {
  const computers = buildComputers({
    strategies: [
      {
        type: 'discord',
        enabled: true,
        allowedUsers: ['admin-1'],
        allowedGuilds: ['good-guild'],
        blockedGuilds: [],
      },
    ],
    // No getDiscordClient/fetchDiscordGuildResultsImpl injected, so the
    // computer falls back to the shared bot client, which is null in this
    // test process (never started) -- exercising the same "bot not
    // configured" path discord-roles.js's own tests drive directly.
  })
  expect(await computers.discord('some-account')).toBeNull()
  // allowedUsers needs no guild data at all, so it is honoured even with no
  // bot connection.
  expect(await computers.discord('admin-1')).toEqual(
    expect.objectContaining({ admin: true }),
  )
})

test("buildComputers' discord computer honours an injected client + fetch implementation, passing the client and relevant guild ids straight through", async () => {
  let calledWith = null
  const computers = buildComputers({
    strategies: [
      {
        type: 'discord',
        enabled: true,
        allowedUsers: [],
        allowedGuilds: ['good-guild'],
        blockedGuilds: ['bad-guild'],
      },
    ],
    getDiscordClient: () => ({ fake: true }),
    fetchDiscordGuildResultsImpl: async (client, guildIds, userId) => {
      calledWith = { client, guildIds, userId }
      return { 'good-guild': { status: 'member', roles: [] } }
    },
  })
  const perms = await computers.discord('some-account')
  expect(calledWith).toEqual({
    client: { fake: true },
    guildIds: ['bad-guild', 'good-guild'],
    userId: 'some-account',
  })
  // `bad-guild` has no entry in the injected result, so it is unknown and
  // the whole computation is skipped -- this is exercising the wiring, not
  // re-testing computeDiscordPerms's own role-matching rules (covered by
  // auth-discord-perms.test.js).
  expect(perms).toBeNull()
})
