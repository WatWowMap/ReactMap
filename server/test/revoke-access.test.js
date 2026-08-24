// server/test/revokeAccess.test.js
const { test, expect } = require('bun:test')
const {
  planProviderRevocation,
  selectUserIdsByPermsFlag,
} = require('../src/auth/revoke-access')

test('a user losing one provider while keeping another', () => {
  const rows = [
    { id: 'd1', userId: 'u1', providerId: 'discord' },
    { id: 't1', userId: 'u1', providerId: 'telegram' },
  ]
  const { removed, remaining } = planProviderRevocation(rows, 'u1', 'discord')
  expect(removed).toEqual([{ id: 'd1', userId: 'u1', providerId: 'discord' }])
  expect(remaining).toEqual([
    { id: 't1', userId: 'u1', providerId: 'telegram' },
  ])
})

test('a user losing their only provider', () => {
  const rows = [{ id: 'd1', userId: 'u1', providerId: 'discord' }]
  const { removed, remaining } = planProviderRevocation(rows, 'u1', 'discord')
  expect(removed).toEqual([{ id: 'd1', userId: 'u1', providerId: 'discord' }])
  expect(remaining).toEqual([])
})

test('a user with no user_perms rows at all does not throw', () => {
  expect(() => planProviderRevocation([], 'u1', 'discord')).not.toThrow()
  expect(planProviderRevocation([], 'u1', 'discord')).toEqual({
    removed: [],
    remaining: [],
  })
})

test('another user on the same provider is left alone', () => {
  const rows = [
    { id: 'd1', userId: 'u1', providerId: 'discord' },
    { id: 'd2', userId: 'u2', providerId: 'discord' },
  ]
  const { removed, remaining } = planProviderRevocation(rows, 'u1', 'discord')
  expect(removed).toEqual([{ id: 'd1', userId: 'u1', providerId: 'discord' }])
  expect(remaining).toEqual([{ id: 'd2', userId: 'u2', providerId: 'discord' }])
})

test('selectUserIdsByPermsFlag picks users matching provider and flag', () => {
  const rows = [
    { userId: 'u1', providerId: 'discord', perms: { donor: false } },
    { userId: 'u2', providerId: 'discord', perms: { donor: true } },
    { userId: 'u3', providerId: 'telegram', perms: { donor: false } },
  ]
  expect(selectUserIdsByPermsFlag(rows, 'discord', 'donor', false)).toEqual([
    'u1',
  ])
})

test('selectUserIdsByPermsFlag de-duplicates a user with multiple matching rows', () => {
  const rows = [
    { userId: 'u1', providerId: 'discord', perms: { trial: true } },
    { userId: 'u1', providerId: 'discord', perms: { trial: true } },
  ]
  expect(selectUserIdsByPermsFlag(rows, 'discord', 'trial', true)).toEqual([
    'u1',
  ])
})

test('selectUserIdsByPermsFlag returns nothing, and does not throw, on an empty row set', () => {
  expect(() =>
    selectUserIdsByPermsFlag([], 'discord', 'trial', true),
  ).not.toThrow()
  expect(selectUserIdsByPermsFlag([], 'discord', 'trial', true)).toEqual([])
})
