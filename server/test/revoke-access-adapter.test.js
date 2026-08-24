// server/test/revokeAccessAdapter.test.js
const { test, expect } = require('bun:test')
const {
  revokeProviderAccess,
  applyToUsersWithPermsFlag,
} = require('../src/auth/revoke-access-adapter')

test('revokeProviderAccess deletes the matching row and revokes sessions, keeping another provider', async () => {
  let deletedIds = null
  let revokedFor = null
  await revokeProviderAccess('u1', 'discord', {
    getUserPerms: async () => [
      { id: 'd1', userId: 'u1', providerId: 'discord' },
      { id: 't1', userId: 'u1', providerId: 'telegram' },
    ],
    deleteUserPermsRows: async (ids) => {
      deletedIds = ids
    },
    revokeSessions: async (userId) => {
      revokedFor = userId
    },
  })
  expect(deletedIds).toEqual(['d1'])
  expect(revokedFor).toBe('u1')
})

test('revokeProviderAccess deletes a user losing their only provider', async () => {
  let deletedIds = null
  await revokeProviderAccess('u1', 'discord', {
    getUserPerms: async () => [
      { id: 'd1', userId: 'u1', providerId: 'discord' },
    ],
    deleteUserPermsRows: async (ids) => {
      deletedIds = ids
    },
    revokeSessions: async () => {},
  })
  expect(deletedIds).toEqual(['d1'])
})

test('revokeProviderAccess still revokes sessions for a user with no user_perms rows, and does not throw', async () => {
  let deleteWasCalled = false
  let revokedFor = null
  await expect(
    revokeProviderAccess('u1', 'discord', {
      getUserPerms: async () => [],
      deleteUserPermsRows: async () => {
        deleteWasCalled = true
      },
      revokeSessions: async (userId) => {
        revokedFor = userId
      },
    }),
  ).resolves.toBeUndefined()
  expect(deleteWasCalled).toBe(false)
  expect(revokedFor).toBe('u1')
})

test('applyToUsersWithPermsFlag applies to every matching user and returns their ids', async () => {
  const applied = []
  const userIds = await applyToUsersWithPermsFlag('discord', 'trial', true, {
    getUserPermsForProvider: async () => [
      { userId: 'u1', providerId: 'discord', perms: { trial: true } },
      { userId: 'u2', providerId: 'discord', perms: { trial: false } },
    ],
    apply: async (userId) => {
      applied.push(userId)
    },
  })
  expect(applied).toEqual(['u1'])
  expect(userIds).toEqual(['u1'])
})

test('applyToUsersWithPermsFlag applies to nothing, and does not throw, when no rows match', async () => {
  const applied = []
  await expect(
    applyToUsersWithPermsFlag('discord', 'trial', true, {
      getUserPermsForProvider: async () => [],
      apply: async (userId) => {
        applied.push(userId)
      },
    }),
  ).resolves.toEqual([])
  expect(applied).toEqual([])
})
