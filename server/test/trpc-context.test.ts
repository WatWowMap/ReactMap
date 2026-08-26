import { expect, test } from 'bun:test'

import { createContextFactory } from '../src/trpc/context'

const req = { req: new Request('http://localhost/trpc') }

test('an anonymous visitor gets perms null, not an empty object', async () => {
  const createContext = createContextFactory({
    golbatClient: {},
    getSession: async () => null,
    getPerms: async () => {
      throw new Error('perms must not be loaded for an anonymous visitor')
    },
  })

  const ctx = await createContext(req)

  expect(ctx.user).toBeNull()
  expect(ctx.perms).toBeNull()
})

test('a signed-in user gets the merged user_perms rows', async () => {
  const createContext = createContextFactory({
    golbatClient: {},
    getSession: async () => ({ user: { id: 'u1' }, session: { userId: 'u1' } }),
    getPerms: async (userId: string) => [
      {
        providerId: 'discord',
        perms: { alerts: userId === 'u1', pokemon: false },
      },
      { providerId: 'telegram', perms: { pokemon: true } },
    ],
  })

  const ctx = await createContext(req)

  expect(ctx.perms).toEqual({ alerts: true, pokemon: true })
})

test('a signed-in account holding no rows gets an empty perms object', async () => {
  const createContext = createContextFactory({
    golbatClient: {},
    getSession: async () => ({ user: { id: 'u1' }, session: { userId: 'u1' } }),
    getPerms: async () => [],
  })

  const ctx = await createContext(req)

  expect(ctx.perms).toEqual({})
})
