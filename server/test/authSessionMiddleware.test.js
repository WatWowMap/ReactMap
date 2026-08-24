const { test, expect } = require('bun:test')
const {
  mergePerms,
  authSessionMiddleware,
} = require('../src/middleware/authSession')

test('perms rows merge into one object', () => {
  expect(
    mergePerms([
      { providerId: 'discord', perms: { map: true, admin: false } },
      { providerId: 'telegram', perms: { admin: true } },
    ]),
  ).toEqual({ map: true, admin: true })
})

test('a true from any provider wins', () => {
  expect(
    mergePerms([
      { providerId: 'discord', perms: { admin: false } },
      { providerId: 'telegram', perms: { admin: true } },
    ]).admin,
  ).toBe(true)
})

test('no rows merge to an empty object, not undefined', () => {
  expect(mergePerms([])).toEqual({})
})

test('an existing passport user is left alone when better auth has no session', async () => {
  const middleware = authSessionMiddleware({
    getSession: async () => null,
    getPerms: async () => [],
  })
  const req = { headers: {}, user: { id: 'passport-user' }, session: {} }
  let called = false
  await middleware(req, {}, () => {
    called = true
  })
  expect(called).toBe(true)
  expect(req.user.id).toBe('passport-user')
})

test('a better auth session replaces req.user and fills perms', async () => {
  const middleware = authSessionMiddleware({
    getSession: async () => ({ user: { id: 'abc', username: 'ash' } }),
    getPerms: async () => [{ providerId: 'discord', perms: { map: true } }],
  })
  const req = { headers: {}, session: {} }
  await middleware(req, {}, () => {})
  expect(req.user.id).toBe('abc')
  expect(req.session.perms).toEqual({ map: true })
  // Most of the codebase reads perms off the user, not the session.
  expect(req.user.perms).toEqual({ map: true })
})
