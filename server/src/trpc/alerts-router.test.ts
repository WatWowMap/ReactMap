import { expect, test } from 'bun:test'
import config from '@rm/config'

import {
  alertRuleShape,
  alertsRouter,
  POKEMON_WIRE_NAMES,
  resolvePlatformId,
} from './alerts-router'

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

// --- writes ---------------------------------------------------------------

// The two write paths Poracle actually has. A collection POST creates, and a
// uid-addressed PUT/DELETE edits or removes one rule.
const CREATE_PATH = '/v2/humans/123/tracking/pokemon'
const ITEM_PATH = '/v2/humans/123/tracking/pokemon/7'

/**
 * A Poracle that records what a write asked for and 404s a rule it does not
 * own.
 *
 * A fake that answers every write identically cannot test routing, a query
 * string, or a body -- the same gap that let a read point at the wrong
 * endpoint and pass. `owned` is the set of uids this human has, so a write
 * against somebody else's rule takes the 404 Poracle would return.
 */
function fakeWrites(
  options: { body?: any; owned?: number[]; response?: any } = {},
) {
  const sent: {
    method: string
    path: string
    body: any
  }[] = []
  const owned = options.owned ?? [7]
  return {
    sent,
    get: async (path: string) => {
      if (path === TRACKING_PATH)
        return { status: 200, body: options.body ?? SNAPSHOT_BODY }
      return { status: 404, body: null }
    },
    send: async (method: string, path: string, body: any) => {
      sent.push({ method, path, body })
      const uid = Number(path.split('?')[0]?.split('/').pop())
      if (method !== 'POST' && !owned.includes(uid))
        return { status: 404, body: null }
      return {
        status: 200,
        body: options.response ?? {
          created: [{ uid: 11, pokemon_id: 25 }],
          updated: [{ uid: 12, pokemon_id: 26 }],
          unchanged: [],
          deleted: [{ uid: 7, pokemon_id: 25 }],
        },
      }
    },
  }
}

test('create suppresses the confirmation push', async () => {
  // Without silent=true a batch notifies the user about the batch they just
  // performed, once per rule.
  let seenPath = ''
  const ctx = {
    ...BASE,
    poracleClient: {
      get: async () => ({ status: 200, body: SNAPSHOT_BODY }),
      send: async (_m: string, path: string) => {
        seenPath = path
        return {
          status: 200,
          body: { created: [], updated: [], unchanged: [] },
        }
      },
    },
  }
  await caller(ctx).create({ rules: [] })
  expect(seenPath).toContain('silent=true')
})

test('replace returns the new uid, because PUT is delete plus insert', async () => {
  const ctx = {
    ...BASE,
    poracleClient: {
      get: async () => ({ status: 200, body: SNAPSHOT_BODY }),
      send: async () => ({ status: 200, body: { updated: [{ uid: 99 }] } }),
    },
  }
  expect(
    await caller(ctx).replace({ uid: 7, rule: { pokemonId: 25 } }),
  ).toEqual({
    uid: 99,
  })
})

test('no write procedure accepts a human id', () => {
  for (const name of ['create', 'replace', 'remove']) {
    const def: any = (alertsRouter as any)._def.procedures[name]._def
    const schema = JSON.stringify(def.inputs ?? [])
    expect(schema).not.toContain('humanId')
    expect(schema).not.toContain('platformId')
  }
})

test('a write requires the alerts perm', async () => {
  const ctx = { ...BASE, perms: { alerts: false } }
  await expect(caller(ctx).remove({ uid: 1 })).rejects.toThrow(/not available/)
})

test('a blocked human can read but cannot write', async () => {
  // Task 6 computes pokemonBlocked for `status`. The reads stay available so
  // someone can still see what they are subscribed to; only the writes are
  // refused. A blocked account that could still create rules would make the
  // block decorative.
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
      send: async () => ({ status: 200, body: {} }),
    },
  }
  await expect(caller(ctx).snapshot()).resolves.toBeDefined()
  for (const call of [
    () => caller(ctx).create({ rules: [] }),
    () => caller(ctx).replace({ uid: 7, rule: { pokemonId: 25 } }),
    () => caller(ctx).remove({ uid: 7 }),
  ]) {
    await expect(call()).rejects.toThrow(/blocked/i)
  }
})

test('an operator-disabled category blocks writes for everyone', async () => {
  const ctx = { ...BASE, poracleConfig: { disabledHooks: ['monster'] } }
  await expect(caller(ctx).remove({ uid: 7 })).rejects.toThrow(/blocked/i)
})

test('create posts the batch to the pokemon collection', async () => {
  const client = fakeWrites()
  const result = await caller({ ...BASE, poracleClient: client }).create({
    rules: [{ pokemonId: 25, ivMin: 90 }],
  })

  expect(client.sent).toHaveLength(1)
  expect(client.sent[0]?.method).toBe('POST')
  expect(client.sent[0]?.path.split('?')[0]).toBe(CREATE_PATH)
  // Poracle's POST body is a bare array of rule objects, not an envelope.
  expect(client.sent[0]?.body).toEqual([{ pokemon_id: 25, min_iv: 90 }])
  expect(result.created).toHaveLength(1)
  expect(result.created[0]).toMatchObject({ uid: 11, pokemonId: 25 })
  expect(result.updated[0]).toMatchObject({ uid: 12 })
  expect(result.unchanged).toEqual([])
})

test('a write response carries the profile it was written to', async () => {
  // Poracle stamps profile_no onto a rule only in the snapshot's all_profiles
  // mode; a write response has none. Left unfilled every created rule comes
  // back as profile 0, which is not a profile anybody owns.
  const client = fakeWrites()
  const result = await caller({ ...BASE, poracleClient: client }).create({
    rules: [{ pokemonId: 25 }],
  })
  expect(result.created[0]?.profileNo).toBe(1)
})

test('an unset filter is omitted rather than sent as null', async () => {
  // Poracle reads an omitted field as its documented default and rejects a
  // field it does not know. Sending every key with an undefined value would
  // be a 422 on a rule the client meant to leave alone.
  const client = fakeWrites()
  await caller({ ...BASE, poracleClient: client }).create({
    rules: [{ pokemonId: 25 }],
  })
  // Keys, not a deep equality: an undefined value compares equal to a missing
  // one, so `toEqual` would pass on a body carrying all 32 columns as
  // undefined -- which is the very thing this is here to catch.
  expect(Object.keys(client.sent[0]?.body[0])).toEqual(['pokemon_id'])
})

test('a profile the human does not own is refused before anything is sent', async () => {
  // Poracle's resolveHuman takes ?profile straight off the query string
  // without checking the human owns it, so this is the only check there is.
  const client = fakeWrites({
    body: { ...SNAPSHOT_BODY, profiles: [{ profile_no: 1, name: 'default' }] },
  })
  await expect(
    caller({ ...BASE, poracleClient: client }).create({
      rules: [{ pokemonId: 25, profileNo: 4 }],
    }),
  ).rejects.toThrow(/profile/i)
  expect(client.sent).toEqual([])
})

test('a profile the human does own is forwarded on the query string', async () => {
  const client = fakeWrites({
    body: { ...SNAPSHOT_BODY, profiles: [{ profile_no: 2, name: 'work' }] },
  })
  await caller({ ...BASE, poracleClient: client }).create({
    rules: [{ pokemonId: 25, profileNo: 2 }],
  })
  expect(client.sent[0]?.path).toContain('profile=2')
})

test('replace puts to the addressed rule', async () => {
  const client = fakeWrites({ response: { updated: [{ uid: 99 }] } })
  await caller({ ...BASE, poracleClient: client }).replace({
    uid: 7,
    rule: { pokemonId: 25 },
  })
  expect(client.sent[0]?.method).toBe('PUT')
  expect(client.sent[0]?.path.split('?')[0]).toBe(ITEM_PATH)
  expect(client.sent[0]?.path).toContain('silent=true')
  expect(client.sent[0]?.body).toEqual({ pokemon_id: 25 })
})

test('remove deletes the addressed rule and returns the uids', async () => {
  const client = fakeWrites()
  const result = await caller({ ...BASE, poracleClient: client }).remove({
    uid: 7,
  })
  expect(client.sent[0]?.method).toBe('DELETE')
  expect(client.sent[0]?.path.split('?')[0]).toBe(ITEM_PATH)
  // Poracle pushes a removal confirmation too, so an edit or a delete made in
  // the tab would otherwise DM the user about what they just did in the tab.
  expect(client.sent[0]?.path).toContain('silent=true')
  expect(result).toEqual({ deleted: [7] })
})

test('a rule this human does not own comes back as a 404, not a success', async () => {
  // Poracle 404s a uid its owner check rejects. Swallowing that would report
  // a delete that never happened.
  const client = fakeWrites({ owned: [7] })
  await expect(
    caller({ ...BASE, poracleClient: client }).remove({ uid: 8 }),
  ).rejects.toThrow(/not found/i)
})

test('a Poracle that is not answering fails the write rather than reporting success', async () => {
  // The reads degrade to an empty tab on purpose. A write cannot: a save that
  // silently did nothing is the worst of the three outcomes.
  const ctx = {
    ...BASE,
    poracleClient: {
      get: async () => ({ status: 200, body: SNAPSHOT_BODY }),
      send: async () => {
        throw new Error('fetch failed: ECONNREFUSED')
      },
    },
  }
  await expect(caller(ctx).create({ rules: [] })).rejects.toThrow(/Alerts/i)
})

test('a write refuses when the snapshot that authorizes it cannot be read', async () => {
  // The blocked-category check and the profile check both read this snapshot.
  // Writing anyway would be writing with neither check performed.
  const ctx = {
    ...BASE,
    poracleClient: {
      get: async () => ({ status: 503, body: null }),
      send: async () => ({ status: 200, body: {} }),
    },
  }
  await expect(caller(ctx).remove({ uid: 7 })).rejects.toThrow(/Alerts/i)
})

test('replace fails when Poracle names no replacement rule', async () => {
  // The new uid is the whole return value; PUT is delete plus insert, so a
  // response without one leaves the client pointing at a row that is gone.
  const ctx = {
    ...BASE,
    poracleClient: {
      get: async () => ({ status: 200, body: SNAPSHOT_BODY }),
      send: async () => ({ status: 200, body: { updated: [] } }),
    },
  }
  await expect(
    caller(ctx).replace({ uid: 7, rule: { pokemonId: 25 } }),
  ).rejects.toThrow(/uid/i)
})

test('every input field a client may set has a Poracle column to land in', () => {
  // The zod shape and the wire-name map are two lists of the same fields.
  // A field added to one and not the other is either silently dropped on the
  // way out or rejected by Poracle as an unknown property.
  expect(Object.keys(alertRuleShape).sort()).toEqual(
    Object.keys(POKEMON_WIRE_NAMES).sort(),
  )
})

test('a batch may not straddle two profiles', async () => {
  // Poracle takes one ?profile for the whole POST body. Honouring the first
  // rule's profile would silently move every other rule into it.
  const client = fakeWrites({
    body: {
      ...SNAPSHOT_BODY,
      profiles: [
        { profile_no: 1, name: 'default' },
        { profile_no: 2, name: 'work' },
      ],
    },
  })
  await expect(
    caller({ ...BASE, poracleClient: client }).create({
      rules: [
        { pokemonId: 25, profileNo: 1 },
        { pokemonId: 26, profileNo: 2 },
      ],
    }),
  ).rejects.toThrow(/profile/i)
  expect(client.sent).toEqual([])
})

test('a rule that names no pokemon is refused before it costs a round trip', async () => {
  // pokemon_id is the one field Poracle requires. Leaving it to Poracle's 422
  // would validate a network hop later than we can, and would hand Tasks 12
  // and 13 an AlertInput whose pokemonId is optional but not really optional.
  const client = fakeWrites()
  await expect(
    caller({ ...BASE, poracleClient: client }).create({
      rules: [{ ivMin: 90 } as any],
    }),
  ).rejects.toThrow()
  expect(client.sent).toEqual([])
})
