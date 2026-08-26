import { expect, test } from 'bun:test'

import { alertsRouter } from './alerts-router'

function caller(ctx: any) {
  return alertsRouter.createCaller(ctx)
}

const SNAPSHOT_BODY = {
  human: {
    enabled: 1,
    current_profile_no: 1,
    latitude: null,
    longitude: null,
    area: '[]',
  },
  tracking: { pokemon: [] },
  profiles: [],
  locations: { locations: [] },
}

const BASE = {
  user: { id: 'u1' },
  session: null,
  perms: { alerts: true },
  poracleClient: { get: async () => ({ status: 200, body: SNAPSHOT_BODY }) },
  platformId: '123',
}

test('snapshot requires the alerts perm', async () => {
  const ctx = { ...BASE, perms: { alerts: false } }
  await expect(caller(ctx).snapshot()).rejects.toThrow(/not available/)
})

test('snapshot requires a signed-in user', async () => {
  const ctx = { ...BASE, user: null, perms: null }
  await expect(caller(ctx).snapshot()).rejects.toThrow(/Sign in/)
})

test('the platform id is never accepted as input', () => {
  // Structural: spec 7.4. If this ever gains an input schema with an id in
  // it, that is the impersonation hole, so assert on the shape rather than
  // trying to exploit it.
  const def: any = (alertsRouter as any)._def.procedures.snapshot._def
  expect(def.inputs ?? []).toHaveLength(0)
})

test('status reports unconfigured when no Poracle is set up', async () => {
  const ctx = { ...BASE, poracleClient: null }
  expect(await caller(ctx).status()).toEqual({ state: 'unconfigured' })
})

test('an account with no linked Discord identity is absent, not a crash', async () => {
  const ctx = { ...BASE, platformId: null }
  expect(await caller(ctx).status()).toMatchObject({ state: 'absent' })
})

test('a human blocked from monster alerts gets a live tab that cannot write', async () => {
  // 1.x's getAllowedCategories subtracted disabledHooks and the human's own
  // blocked_alerts from the category list. With one category there is no list
  // left, but the subtraction still decides whether this account may use it.
  const ctx = {
    ...BASE,
    poracleClient: {
      get: async () => ({
        status: 200,
        body: {
          ...SNAPSHOT_BODY,
          human: { ...SNAPSHOT_BODY.human, blocked_alerts: '["monster"]' },
        },
      }),
    },
  }
  expect(await caller(ctx).status()).toMatchObject({
    state: 'present',
    pokemonBlocked: true,
  })
})

test('an operator-disabled category blocks it for everyone', async () => {
  const ctx = { ...BASE, poracleConfig: { disabledHooks: ['monster'] } }
  expect(await caller(ctx).status()).toMatchObject({ pokemonBlocked: true })
})

test('blocked_alerts that is null does not crash and does not block', async () => {
  // 1.x read human.blocked_alerts off an undefined human and threw, which is
  // how a dead Poracle became an empty tab with dead buttons.
  const ctx = {
    ...BASE,
    poracleClient: {
      get: async () => ({
        status: 200,
        body: {
          ...SNAPSHOT_BODY,
          human: { ...SNAPSHOT_BODY.human, blocked_alerts: null },
        },
      }),
    },
  }
  expect(await caller(ctx).status()).toMatchObject({ pokemonBlocked: false })
})
