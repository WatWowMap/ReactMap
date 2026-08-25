// server/test/authTelegramPerms.test.js
const { test, expect } = require('bun:test')
const { computeTelegramPerms } = require('../src/auth/telegram-perms')

test('a perm whose roles include a joined group is granted', () => {
  const perms = computeTelegramPerms(
    { id: 'u1', groups: ['u1', 'group-a'] },
    {
      allowedUsers: [],
      permsConfig: { map: { enabled: true, roles: ['group-a'] } },
      alwaysEnabledPerms: [],
    },
  )
  expect(perms.map).toBe(true)
})

test('a perm whose roles list the user id directly is granted (per-user targeting)', () => {
  const perms = computeTelegramPerms(
    { id: 'u1', groups: ['u1'] },
    {
      allowedUsers: [],
      permsConfig: { map: { enabled: true, roles: ['u1'] } },
      alwaysEnabledPerms: [],
    },
  )
  expect(perms.map).toBe(true)
})

test('allowedUsers grants admin only, not a free pass on every perm', () => {
  const perms = computeTelegramPerms(
    { id: 'u1', groups: ['u1'] },
    {
      allowedUsers: ['u1'],
      permsConfig: { map: { enabled: true, roles: [] } },
      alwaysEnabledPerms: [],
    },
  )
  expect(perms.admin).toBe(true)
  expect(perms.map).toBe(false)
})

test('not a member of any matching group grants nothing', () => {
  const perms = computeTelegramPerms(
    { id: 'u1', groups: ['u1'] },
    {
      allowedUsers: [],
      permsConfig: { map: { enabled: true, roles: ['group-a'] } },
      alwaysEnabledPerms: [],
    },
  )
  expect(perms.map).toBe(false)
  expect(perms.admin).toBe(false)
  expect(perms.trial).toBe(false)
})
