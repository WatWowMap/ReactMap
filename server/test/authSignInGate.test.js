// server/test/authSignInGate.test.js
const { test, expect } = require('bun:test')
const {
  evaluateSignInGate,
  checkSignInGate,
} = require('../src/auth/signInGate')

test('a user with no linked provider accounts is allowed (local-only sign-in)', () => {
  expect(evaluateSignInGate([])).toEqual({ allow: true })
  expect(evaluateSignInGate(null)).toEqual({ allow: true })
  expect(evaluateSignInGate(undefined)).toEqual({ allow: true })
})

test('a user in a blocked guild is denied, even with map perms', () => {
  expect(
    evaluateSignInGate([
      { map: true, blocked: true, blockedGuildNames: ['Evil Guild'] },
    ]),
  ).toEqual({ allow: false, reason: 'blocked_guild' })
})

test('an allowedUsers admin is allowed, because getPerms already clears blocked for them', () => {
  // DiscordClient#getPerms never evaluates blockedGuilds for an allowedUsers
  // id: the allowedUsers branch returns early with every perm (including
  // map) forced true and `blocked` never set. This is what that computed
  // perms object looks like by the time it reaches the gate -- the gate is
  // not re-deriving the precedence, just honouring it.
  expect(evaluateSignInGate([{ map: true, admin: true }])).toEqual({
    allow: true,
  })
})

test('a user with no map perms is denied', () => {
  expect(evaluateSignInGate([{ map: false, blocked: false }])).toEqual({
    allow: false,
    reason: 'no_map_perms',
  })
})

test('an ordinary permitted user is allowed', () => {
  expect(evaluateSignInGate([{ map: true, blocked: false }])).toEqual({
    allow: true,
  })
})

test('one blocked account denies even if another linked account has map', () => {
  expect(
    evaluateSignInGate([
      { map: true, blocked: true },
      { map: true, blocked: false },
    ]),
  ).toEqual({ allow: false, reason: 'blocked_guild' })
})

test('one account with map allows even if another has none', () => {
  expect(
    evaluateSignInGate([
      { map: false, blocked: false },
      { map: true, blocked: false },
    ]),
  ).toEqual({ allow: true })
})

test('checkSignInGate loads accounts, computes perms, and gates on the result', async () => {
  const result = await checkSignInGate('u1', {
    getAccounts: async () => [
      { userId: 'u1', providerId: 'discord', accountId: 'd1' },
    ],
    computers: { discord: async () => ({ map: false, blocked: true }) },
  })
  expect(result).toEqual({ allow: false, reason: 'blocked_guild' })
})

test('checkSignInGate allows a user with no computed rows (no matching computer)', async () => {
  const result = await checkSignInGate('u1', {
    getAccounts: async () => [
      { userId: 'u1', providerId: 'credential', accountId: 'u1' },
    ],
    computers: { discord: async () => ({ map: true }) },
  })
  expect(result).toEqual({ allow: true })
})
