import { expect, test } from 'bun:test'

import { createContextFactory } from '../src/trpc/context'
import { requirePerm } from '../src/trpc/require-perm'

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

test('a revoked grant is denied on the next request, with no logout', async () => {
  // The acceptance criterion this whole task exists for. Perms are re-read on
  // every request, so a role lost between two requests is gone from the second
  // context -- no logout, nothing cleared. Caching the loaded perms anywhere is
  // 1.x's `selectedWebhook` bug, and it would break exactly this assertion.
  let call = 0
  const createContext = createContextFactory({
    golbatClient: {},
    getSession: async () => ({ user: { id: 'u1' }, session: { userId: 'u1' } }),
    getPerms: async () => {
      call += 1
      return [{ providerId: 'discord', perms: { alerts: call === 1 } }]
    },
  })

  const before = await createContext(req)
  expect(requirePerm(before as any, 'alerts')).toBe('u1')

  const after = await createContext(req)
  expect(() => requirePerm(after as any, 'alerts')).toThrow(/not available/)
})

test('a deployment with no Poracle gets a null client, not a broken one', async () => {
  // `null` is what `alerts.status` turns into "unconfigured". A client built
  // against an absent host would instead fail at request time, which reads to
  // a user as Poracle being down rather than absent.
  const createContext = createContextFactory({
    golbatClient: {},
    getSession: async () => null,
    getPerms: async () => [],
    poracleClient: null,
  })

  const ctx: any = await createContext(req)

  expect(ctx.poracleClient).toBeNull()
  // Resolved lazily by the Alerts procedures, so nothing else pays the query.
  expect('platformId' in ctx).toBe(false)
})
