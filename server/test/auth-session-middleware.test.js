const { test, expect } = require('bun:test')
const {
  mergePerms,
  authSessionMiddleware,
} = require('../src/middleware/auth-session')

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

test('array-valued perms union instead of the first row winning, in either row order', () => {
  const restricted = {
    providerId: 'discord',
    perms: { areaRestrictions: ['area1'] },
  }
  const unrestricted = {
    providerId: 'telegram',
    perms: { areaRestrictions: [] },
  }

  // The query has no ORDER BY, so MySQL can return either row first. An
  // empty array is truthy, so a naive `merged[key] || value` fold lets
  // whichever row lands first decide the outcome -- and an empty
  // areaRestrictions means unrestricted, so row order silently controls map
  // access. Both orderings must produce the identical, restricted result.
  const forward = mergePerms([restricted, unrestricted])
  const backward = mergePerms([unrestricted, restricted])
  expect(forward).toEqual({ areaRestrictions: ['area1'] })
  expect(backward).toEqual({ areaRestrictions: ['area1'] })
  expect(forward).toEqual(backward)
})

test('array-valued perms union values from both providers, deduplicated', () => {
  const rows = [
    { providerId: 'discord', perms: { areaRestrictions: ['area1', 'area2'] } },
    { providerId: 'telegram', perms: { areaRestrictions: ['area2', 'area3'] } },
  ]
  expect(mergePerms(rows).areaRestrictions.sort()).toEqual([
    'area1',
    'area2',
    'area3',
  ])
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
