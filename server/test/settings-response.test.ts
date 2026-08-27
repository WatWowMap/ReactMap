import { expect, test } from 'bun:test'
import { buildSettingsResponse } from '../src/settings-response'

test('no session yields an anonymous response, not an error', async () => {
  const body = await buildSettingsResponse(new Headers(), {
    getSession: async () => null,
    getPerms: async () => [],
  })
  expect(body.user.loggedIn).toBe(false)
  expect(body.user.perms).toEqual({})
  expect(body.authentication.loggedIn).toBe(false)
})

test('a garbage cookie that throws from getSession yields an anonymous response, not a 500', async () => {
  const body = await buildSettingsResponse(new Headers(), {
    getSession: async () => {
      throw new Error('malformed session token')
    },
    getPerms: async () => [],
  })
  expect(body.user.loggedIn).toBe(false)
  expect(body.authentication.loggedIn).toBe(false)
})

test('a real session yields the caller identified by username with merged perms', async () => {
  const body = await buildSettingsResponse(new Headers(), {
    getSession: async () => ({ user: { id: 'abc', username: 'ash' } }),
    getPerms: async () => [
      { providerId: 'discord', perms: { map: true } },
      { providerId: 'telegram', perms: { admin: false, map: false } },
    ],
  })
  expect(body.user.loggedIn).toBe(true)
  expect(body.user.username).toBe('ash')
  expect(body.user.perms).toEqual({ map: true, admin: false })
  expect(body.authentication.loggedIn).toBe(true)
})

test('does not reconstruct a req.user-shaped object -- only loggedIn, username, perms', async () => {
  const body = await buildSettingsResponse(new Headers(), {
    getSession: async () => ({
      user: { id: 'abc', username: 'ash', email: 'ash@example.com' },
    }),
    getPerms: async () => [],
  })
  expect(Object.keys(body.user).sort()).toEqual([
    'loggedIn',
    'perms',
    'username',
  ])
})

test('the response names the sign-in methods an operator enabled', async () => {
  // Without this the client has to hardcode a provider, and an instance
  // running only local auth would show a Discord button that cannot work.
  const body = await buildSettingsResponse(new Headers(), {
    getSession: async () => null,
    getPerms: async () => [],
    getMethods: () => ['discord'],
  })
  expect(body.authentication.methods).toEqual(['discord'])
})

test('a signed-in response names them too, so a client can offer switching', async () => {
  const body = await buildSettingsResponse(new Headers(), {
    getSession: async () => ({ user: { id: 'u1', username: 'someone' } }),
    getPerms: async () => [],
    getMethods: () => ['discord', 'local'],
  })
  expect(body.authentication.methods).toEqual(['discord', 'local'])
})

test('an instance with no enabled strategy offers nothing rather than everything', async () => {
  const body = await buildSettingsResponse(new Headers(), {
    getSession: async () => null,
    getPerms: async () => [],
    getMethods: () => [],
  })
  expect(body.authentication.methods).toEqual([])
})
