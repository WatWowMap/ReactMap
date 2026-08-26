import { expect, test } from 'bun:test'
import config from '@rm/config'

import { alertsRouter, resolvePlatformId } from './alerts-router'

function caller(ctx: any) {
  return alertsRouter.createCaller(ctx)
}

// The two endpoints this router may call, spelled out. `GET /v2/humans/{id}`
// returns `{ human }` and nothing else, so it cannot serve the tab; the
// snapshot endpoint is the only one carrying tracking, profiles and locations
// together, and dropping either query param silently costs every rule's
// profile number and description.
const HUMAN_PATH = '/v2/humans/123'
const TRACKING_PATH =
  '/v2/humans/123/tracking?all_profiles=true&include_descriptions=true'

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
  locations: { named: [] },
}

/**
 * A Poracle that answers the paths Poracle actually has, and 404s the rest.
 *
 * A fake answering every URL identically cannot test routing, which is how a
 * snapshot pointed at the human endpoint passed every test while rendering an
 * empty tab against a live Poracle. `seen` is what a test asserts on.
 */
function fakePoracle(body: any = SNAPSHOT_BODY) {
  const seen: string[] = []
  return {
    seen,
    get: async (path: string) => {
      seen.push(path)
      if (path === HUMAN_PATH)
        return { status: 200, body: { human: body.human } }
      if (path === TRACKING_PATH) return { status: 200, body }
      return { status: 404, body: null }
    },
  }
}

const BASE = {
  user: { id: 'u1' },
  session: null,
  perms: { alerts: true },
  poracleClient: fakePoracle(),
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

test('the tab comes from the tracking endpoint, with both query params', async () => {
  // GET /v2/humans/{id} carries the human and nothing else, so a snapshot
  // taken from it renders a tab with no rules, no profiles and no locations.
  // all_profiles is what makes a rule outside the active profile visible, and
  // include_descriptions is the only source of AlertRow.description.
  const client = fakePoracle({
    ...SNAPSHOT_BODY,
    tracking: { pokemon: [{ uid: 7, profile_no: 2, description: 'a shiny' }] },
    profiles: [{ profile_no: 2, name: 'default' }],
    locations: { named: [{ label: 'work', latitude: 1, longitude: 2 }] },
  })
  const snapshot = await caller({ ...BASE, poracleClient: client }).snapshot()

  expect(client.seen).toEqual([TRACKING_PATH])
  expect(snapshot.alerts).toHaveLength(1)
  expect(snapshot.alerts[0]).toMatchObject({
    uid: 7,
    profileNo: 2,
    description: 'a shiny',
  })
  expect(snapshot.profiles).toHaveLength(1)
  // Poracle's container is { default?, named[] }, not { locations[] }.
  expect(snapshot.locations).toEqual([
    { label: 'work', latitude: 1, longitude: 2 },
  ])
})

test('a Poracle that is not answering gives an empty tab, not a 500', async () => {
  // The whole point of the three states: an outage is a tab that says so, and
  // status already degrades this way. A snapshot that throws instead turns a
  // restart into an error page.
  const ctx = {
    ...BASE,
    poracleClient: {
      get: async () => {
        throw new Error('fetch failed: ECONNREFUSED')
      },
    },
  }
  expect(await caller(ctx).snapshot()).toMatchObject({ alerts: [] })
})

test('status reports unconfigured when no Poracle is set up', async () => {
  const ctx = { ...BASE, poracleClient: null }
  expect(await caller(ctx).status()).toEqual({
    state: 'unconfigured',
    pokemonBlocked: false,
  })
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
    poracleClient: fakePoracle({
      ...SNAPSHOT_BODY,
      human: { ...SNAPSHOT_BODY.human, blocked_alerts: '["monster"]' },
    }),
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
    poracleClient: fakePoracle({
      ...SNAPSHOT_BODY,
      human: { ...SNAPSHOT_BODY.human, blocked_alerts: null },
    }),
  }
  expect(await caller(ctx).status()).toMatchObject({ pokemonBlocked: false })
})

test('the platform id is the linked Discord account, not whatever row came first', async () => {
  // This return value becomes the `{id}` path segment, which is the identity
  // Poracle acts as, so picking the wrong row is the impersonation bug the
  // whole feature is guarded against. A user with two linked identities is
  // ordinary, and the account table has no order that puts Discord first.
  const rows = [
    { providerId: 'telegram', accountId: 'tg-999' },
    { providerId: 'discord', accountId: 'dc-123' },
  ]
  const platformId = await resolvePlatformId({}, 'u1', {
    listAccounts: async () => rows,
  })
  expect(platformId).toBe('dc-123')
})

test('an account with no Discord row has no platform id', async () => {
  const platformId = await resolvePlatformId({}, 'u1', {
    listAccounts: async () => [{ providerId: 'telegram', accountId: 'tg-999' }],
  })
  expect(platformId).toBeNull()
})

test('a user with no account rows at all has no platform id', async () => {
  const platformId = await resolvePlatformId({}, 'u1', {
    listAccounts: async () => [],
  })
  expect(platformId).toBeNull()
})

test('the account lookup is scoped to the asking user', async () => {
  // The one argument the lookup may narrow on. A lookup that ignored it would
  // hand back somebody else's Discord id and every check downstream would
  // still pass.
  let seen: unknown
  await resolvePlatformId({}, 'u1', {
    listAccounts: async (_db, userId) => {
      seen = userId
      return []
    },
  })
  expect(seen).toBe('u1')
})

test('an operator can actually disable a category in config', () => {
  // pokemonBlocked reads poracle.disabledHooks. Without the key on the
  // interface and in the config default there is no way for an operator to
  // set it, and the plan's operator-disabled criterion is unreachable.
  const poracle: any = config.getSafe('poracle')
  expect(Array.isArray(poracle.disabledHooks)).toBe(true)
})
