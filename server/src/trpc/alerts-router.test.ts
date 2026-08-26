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
/**
 * A snapshot with one rule in it, which every by-uid write now needs: the
 * profile a write targets comes from the rule, so a uid the snapshot does not
 * carry is refused before the round trip.
 */
const WRITE_BODY = {
  ...SNAPSHOT_BODY,
  tracking: { pokemon: [{ uid: 7, profile_no: 1, pokemon_id: 25 }] },
  profiles: [{ profile_no: 1, name: 'default' }],
}

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
        return { status: 200, body: options.body ?? WRITE_BODY }
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
  await caller(ctx).create({ rules: [{ pokemonId: 25 }] })
  expect(seenPath).toContain('silent=true')
})

test('replace returns the new uid, because PUT is delete plus insert', async () => {
  const ctx = {
    ...BASE,
    poracleClient: {
      get: async () => ({ status: 200, body: WRITE_BODY }),
      send: async () => ({ status: 200, body: { updated: [{ uid: 99 }] } }),
    },
  }
  expect(
    await caller(ctx).replace({ uid: 7, rule: { pokemonId: 25 } }),
  ).toEqual({
    uid: 99,
  })
})

/**
 * Every field name an input schema accepts, nested objects and arrays
 * included.
 *
 * Walking `shape` rather than stringifying the schema, which is the whole
 * point: zod keeps `shape` as a lazy getter, so `JSON.stringify` of an input
 * schema is 198 characters carrying no field names at all. A test asserting
 * `not.toContain('humanId')` against that string passes no matter what the
 * inputs are -- `toContain('uid')` is equally false against a schema whose
 * first field is `uid`.
 */
function inputFields(name: string): string[] {
  const def: any = (alertsRouter as any)._def.procedures[name]._def
  const found: string[] = []
  const walk = (schema: any) => {
    const inner = schema?._def?.innerType ?? schema?._def?.type ?? schema
    const shape = inner?.shape ?? inner?._def?.shape
    const resolved = typeof shape === 'function' ? shape() : shape
    if (!resolved) return
    for (const [key, value] of Object.entries(resolved)) {
      found.push(key)
      walk(value)
    }
  }
  for (const input of def.inputs ?? []) walk(input)
  return found
}

test('no write procedure accepts a human id', () => {
  // spec 7.4. The `{id}` path segment is the identity Poracle acts as, so an
  // id on the wire is a request to act as somebody else. A uid is different
  // and is allowed: Poracle resolves every by-uid route through its own
  // ownership check and 404s a row this human does not own.
  const identity = /human|platform|discord|account|user|owner/i
  for (const name of ['create', 'replace', 'remove']) {
    const fields = inputFields(name)
    // The walk has to actually reach the fields, or this asserts nothing
    // twice over.
    expect(fields.length).toBeGreaterThan(0)
    expect(fields.filter((field) => identity.test(field))).toEqual([])
  }
})

test('the write inputs are exactly the fields the procedures document', () => {
  expect(inputFields('create')).toContain('rules')
  expect(inputFields('replace')).toContain('rule')
  expect(inputFields('remove')).toEqual(['uid'])
  // The nested rule is reached, so a field hidden inside it is reached too.
  expect(inputFields('replace')).toContain('pokemonId')
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
          ...WRITE_BODY,
          human: { ...WRITE_BODY.human, blocked_alerts: '["monster"]' },
        },
      }),
      send: async () => ({ status: 200, body: {} }),
    },
  }
  await expect(caller(ctx).snapshot()).resolves.toBeDefined()
  for (const call of [
    () => caller(ctx).create({ rules: [{ pokemonId: 25 }] }),
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
  // toStrictEqual, not toEqual: a property set to undefined compares equal to
  // a missing one, so toEqual passes against a body carrying all 32 columns as
  // undefined -- which is exactly the mistake this is watching for.
  expect(client.sent[0]?.body).toStrictEqual([{ pokemon_id: 25, min_iv: 90 }])
  expect(result).toEqual({ created: 1, updated: 1, unchanged: 0 })
})

test('create promises no uids, because Poracle cannot supply them', async () => {
  // ApplyDiff throws away the uid Insert returns, so a created row comes back
  // with uid 0 and an updated row with the uid that was just deleted to make
  // it. Only PUT stamps a real one. Handing those out would invite a client to
  // edit or delete by an identifier for a row that does not exist.
  const client = fakeWrites()
  const result = await caller({ ...BASE, poracleClient: client }).create({
    rules: [{ pokemonId: 25 }],
  })
  expect(JSON.stringify(result)).not.toContain('uid')
  expect(Object.values(result).every((v) => typeof v === 'number')).toBe(true)
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
  expect(client.sent[0]?.body).toStrictEqual({ pokemon_id: 25 })
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

test('a rule this human does not own is refused without a round trip', async () => {
  // The uid is not in this human's snapshot, so it is not theirs to delete.
  // Poracle's own ownership check would 404 it as well; refusing here means
  // the answer does not depend on which check the request reaches first.
  const client = fakeWrites()
  await expect(
    caller({ ...BASE, poracleClient: client }).remove({ uid: 8 }),
  ).rejects.toThrow(/not found/i)
  expect(client.sent).toEqual([])
})

test('a 404 from Poracle is surfaced, not swallowed', async () => {
  // The snapshot said the rule was there and Poracle says it is not, which is
  // what a rule deleted from the Discord bot mid-edit looks like. Reporting a
  // delete that never happened is the one outcome worse than an error.
  const ctx = {
    ...BASE,
    poracleClient: {
      get: async () => ({ status: 200, body: WRITE_BODY }),
      send: async () => ({ status: 404, body: null }),
    },
  }
  await expect(caller(ctx).remove({ uid: 7 })).rejects.toThrow(/not found/i)
})

test('a rule outside the active profile is written to its own profile', async () => {
  // The tab reads with all_profiles=true, so it lists rules the human's active
  // profile does not contain. Poracle's ownership check is profile-scoped and
  // a write with no profile goes to the active one, so taking the profile from
  // the request would 404 every one of those rules -- a missing argument
  // presenting as data corruption.
  const client = fakeWrites({
    body: {
      ...WRITE_BODY,
      human: { ...WRITE_BODY.human, current_profile_no: 1 },
      tracking: { pokemon: [{ uid: 7, profile_no: 2, pokemon_id: 25 }] },
      profiles: [
        { profile_no: 1, name: 'default' },
        { profile_no: 2, name: 'work' },
      ],
    },
  })
  await caller({ ...BASE, poracleClient: client }).remove({ uid: 7 })
  expect(client.sent[0]?.path).toContain('profile=2')
})

test('a replace may not move a rule to another profile', async () => {
  // PUT deletes and re-inserts within one profile, and the ownership check
  // that finds the old row is scoped to it, so a move cannot be honoured.
  const client = fakeWrites()
  await expect(
    caller({ ...BASE, poracleClient: client }).replace({
      uid: 7,
      rule: { pokemonId: 25, profileNo: 2 },
    }),
  ).rejects.toThrow(/moved between profiles/i)
  expect(client.sent).toEqual([])
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
  await expect(
    caller(ctx).create({ rules: [{ pokemonId: 25 }] }),
  ).rejects.toThrow(/Alerts/i)
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
      get: async () => ({ status: 200, body: WRITE_BODY }),
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

test('a replace preserves the settings the tab cannot edit', async () => {
  // PUT is a full replace and translateV2Pokemon defaults every omitted
  // field, so anything alertRuleShape does not carry is destroyed by an edit.
  // clean is the sharp one: Poracle stores it as a bitmask packed from
  // (clean, edit, summary), so sending clean alone clears the other two bits.
  // Someone who set "keep updated in place" from the Discord bot would lose it
  // the moment they touched that rule in the tab.
  const client = fakeWrites({
    body: {
      ...WRITE_BODY,
      tracking: {
        pokemon: [
          {
            uid: 7,
            profile_no: 1,
            pokemon_id: 25,
            edit: true,
            summary: true,
            pvp_ranking_evolution: 2,
          },
        ],
      },
    },
    response: { updated: [{ uid: 99 }] },
  })
  await caller({ ...BASE, poracleClient: client }).replace({
    uid: 7,
    rule: { pokemonId: 25, clean: true },
  })
  expect(client.sent[0]?.body).toMatchObject({
    pokemon_id: 25,
    clean: true,
    edit: true,
    summary: true,
    pvp_ranking_evolution: 2,
  })
})

test('a replace preserves override areas when the edit does not conflict', async () => {
  const client = fakeWrites({
    body: {
      ...WRITE_BODY,
      tracking: {
        pokemon: [
          { uid: 7, profile_no: 1, pokemon_id: 25, override_areas: ['city'] },
        ],
      },
    },
    response: { updated: [{ uid: 99 }] },
  })
  await caller({ ...BASE, poracleClient: client }).replace({
    uid: 7,
    rule: { pokemonId: 25, ivMin: 90 },
  })
  expect(client.sent[0]?.body?.override_areas).toEqual(['city'])
})

test('an edit that picks a radius drops the areas rather than 422ing', async () => {
  // Poracle rejects override_areas alongside distance > 0 or a location
  // label. Carrying them forward regardless would turn every such edit into a
  // 422; the user picking a radius is the user replacing the areas.
  const client = fakeWrites({
    body: {
      ...WRITE_BODY,
      tracking: {
        pokemon: [
          { uid: 7, profile_no: 1, pokemon_id: 25, override_areas: ['city'] },
        ],
      },
    },
    response: { updated: [{ uid: 99 }] },
  })
  await caller({ ...BASE, poracleClient: client }).replace({
    uid: 7,
    rule: { pokemonId: 25, distance: 500 },
  })
  expect(client.sent[0]?.body).not.toHaveProperty('override_areas')
})

test('a field the stored rule left unset is not invented on the way out', async () => {
  // Poracle projects a field at its default to null on the way out. Sending
  // that null back is harmless but noisy; sending it as a value would not be.
  const client = fakeWrites({ response: { updated: [{ uid: 99 }] } })
  await caller({ ...BASE, poracleClient: client }).replace({
    uid: 7,
    rule: { pokemonId: 25 },
  })
  expect(Object.keys(client.sent[0]?.body)).toEqual(['pokemon_id'])
})

test('create carries nothing forward, because there is nothing to carry', async () => {
  const client = fakeWrites()
  await caller({ ...BASE, poracleClient: client }).create({
    rules: [{ pokemonId: 25 }],
  })
  expect(Object.keys(client.sent[0]?.body[0])).toEqual(['pokemon_id'])
})

test('an empty batch is refused rather than sent', async () => {
  // Poracle answers a body with no rules in it with a 422, so an empty batch
  // is a round trip that can only fail, and a save with nothing in it is a bug
  // in the caller either way.
  const client = fakeWrites()
  await expect(
    caller({ ...BASE, poracleClient: client }).create({ rules: [] }),
  ).rejects.toThrow()
  expect(client.sent).toEqual([])
})

// --- human and profile procedures ------------------------------------------

// Two profiles this human actually owns, for the ownership checks below.
const PROFILES_BODY = {
  ...WRITE_BODY,
  profiles: [
    { profile_no: 1, name: 'default' },
    { profile_no: 2, name: 'work' },
  ],
}

function fakeProfileWrites(
  options: {
    body?: any
    response?: any
    // Overrides the status `send` answers with -- 404 to exercise a
    // procedure's own `notFoundMessage`, or any other non-2xx to exercise
    // the generic BAD_GATEWAY path. Ignored when `sendThrows` is set.
    sendStatus?: number
    // A transport failure (connection refused, DNS, etc.) rather than an
    // HTTP response at all -- `sendWrite` turns this into
    // SERVICE_UNAVAILABLE, distinct from a Poracle-answered non-2xx.
    sendThrows?: boolean
  } = {},
) {
  const sent: { method: string; path: string; body: any }[] = []
  return {
    sent,
    get: async (path: string) => {
      if (path === TRACKING_PATH)
        return { status: 200, body: options.body ?? PROFILES_BODY }
      return { status: 404, body: null }
    },
    send: async (method: string, path: string, body: any) => {
      sent.push({ method, path, body })
      if (options.sendThrows) throw new Error('fetch failed: ECONNREFUSED')
      return {
        status: options.sendStatus ?? 200,
        body: options.response ?? {},
      }
    },
  }
}

test('a profile number the human does not own is rejected before forwarding', async () => {
  // Poracle's resolveHuman takes ?profile from the query string without
  // checking ownership, so this check has to happen here.
  await expect(caller(BASE).switchProfile({ profileNo: 99 })).rejects.toThrow(
    /profile/i,
  )
})

test('switching profile posts the validated number and reports it back', async () => {
  const client = fakeProfileWrites()
  const result = await caller({ ...BASE, poracleClient: client }).switchProfile(
    { profileNo: 2 },
  )
  expect(result).toEqual({ currentProfileNo: 2 })
  expect(client.sent).toEqual([
    { method: 'POST', path: '/v2/humans/123/profile', body: { profile_no: 2 } },
  ])
})

test('setEnabled posts to enable or disable depending on the flag', async () => {
  const client = fakeProfileWrites()
  expect(
    await caller({ ...BASE, poracleClient: client }).setEnabled({
      enabled: true,
    }),
  ).toEqual({ enabled: true })
  expect(
    await caller({ ...BASE, poracleClient: client }).setEnabled({
      enabled: false,
    }),
  ).toEqual({ enabled: false })
  expect(client.sent.map((call) => call.path)).toEqual([
    '/v2/humans/123/enable',
    '/v2/humans/123/disable',
  ])
})

test('addProfile reports nothing beyond confirmation, because Poracle never names the number it assigned', async () => {
  const client = fakeProfileWrites()
  const result = await caller({ ...BASE, poracleClient: client }).addProfile({
    name: 'work',
  })
  expect(result).toEqual({ added: true })
  expect(client.sent).toEqual([
    {
      method: 'POST',
      path: '/v2/humans/123/profiles',
      body: { name: 'work' },
    },
  ])
})

test('deleteProfile refuses a profile this human does not own', async () => {
  const client = fakeProfileWrites()
  await expect(
    caller({ ...BASE, poracleClient: client }).deleteProfile({
      profileNo: 99,
    }),
  ).rejects.toThrow(/profile/i)
  expect(client.sent).toEqual([])
})

test('deleteProfile deletes the validated profile and reports its number', async () => {
  const client = fakeProfileWrites()
  const result = await caller({
    ...BASE,
    poracleClient: client,
  }).deleteProfile({ profileNo: 2 })
  expect(result).toEqual({ deleted: 2 })
  expect(client.sent).toEqual([
    { method: 'DELETE', path: '/v2/humans/123/profiles/2', body: undefined },
  ])
})

test('copyProfileRules is named for what it does: a destructive overwrite of the destination, not a duplicate', async () => {
  const client = fakeProfileWrites()
  const result = await caller({
    ...BASE,
    poracleClient: client,
  }).copyProfileRules({ fromProfileNo: 1, toProfileNo: 2 })
  expect(result).toEqual({ toProfileNo: 2 })
  expect(client.sent).toEqual([
    {
      method: 'POST',
      path: '/v2/humans/123/profiles/2/copy',
      body: { from_profile: 1 },
    },
  ])
})

test('copyProfileRules validates both profile numbers, not just the destination', async () => {
  const client = fakeProfileWrites()
  await expect(
    caller({ ...BASE, poracleClient: client }).copyProfileRules({
      fromProfileNo: 99,
      toProfileNo: 2,
    }),
  ).rejects.toThrow(/profile/i)
  await expect(
    caller({ ...BASE, poracleClient: client }).copyProfileRules({
      fromProfileNo: 1,
      toProfileNo: 99,
    }),
  ).rejects.toThrow(/profile/i)
  expect(client.sent).toEqual([])
})

test('copyProfileRules refuses a self-copy, because Poracle deletes the destination before reading the source', async () => {
  // CopyProfile (store/human_sql.go) runs DELETE ... WHERE profile_no =
  // toProfile, then SELECT ... WHERE profile_no = fromProfile. When the two
  // are equal, the delete empties the profile and the select finds nothing
  // left to restore -- a silent, total loss with a 200 back, unless this is
  // refused before the round trip even starts.
  const client = fakeProfileWrites()
  await expect(
    caller({ ...BASE, poracleClient: client }).copyProfileRules({
      fromProfileNo: 1,
      toProfileNo: 1,
    }),
  ).rejects.toThrow(/itself/i)
  expect(client.sent).toEqual([])
})

// --- negative paths for the five procedures above --------------------------
//
// `fakeProfileWrites` previously only ever answered 200, so nothing here
// exercised a Poracle 404, a non-2xx, or a transport failure for any of
// them -- and `sendWrite`'s `notFoundMessage` override (added for these five
// procedures) was never actually asserted to differ from one procedure to
// the next.

test("setEnabled's 404 names the account, not an alert or a profile", async () => {
  const client = fakeProfileWrites({ sendStatus: 404 })
  await expect(
    caller({ ...BASE, poracleClient: client }).setEnabled({ enabled: true }),
  ).rejects.toThrow(/account was not found/i)
})

test("switchProfile's 404 names the profile", async () => {
  const client = fakeProfileWrites({ sendStatus: 404 })
  await expect(
    caller({ ...BASE, poracleClient: client }).switchProfile({
      profileNo: 1,
    }),
  ).rejects.toThrow(/profile was not found/i)
})

test("addProfile's 404 names the account, not a profile that does not exist yet", async () => {
  const client = fakeProfileWrites({ sendStatus: 404 })
  await expect(
    caller({ ...BASE, poracleClient: client }).addProfile({ name: 'work' }),
  ).rejects.toThrow(/account was not found/i)
})

test("deleteProfile's 404 names the profile", async () => {
  const client = fakeProfileWrites({ sendStatus: 404 })
  await expect(
    caller({ ...BASE, poracleClient: client }).deleteProfile({
      profileNo: 1,
    }),
  ).rejects.toThrow(/profile was not found/i)
})

test("copyProfileRules' 404 names the profile", async () => {
  const client = fakeProfileWrites({ sendStatus: 404 })
  await expect(
    caller({ ...BASE, poracleClient: client }).copyProfileRules({
      fromProfileNo: 1,
      toProfileNo: 2,
    }),
  ).rejects.toThrow(/profile was not found/i)
})

test('a non-2xx Poracle response fails a profile write as a bad gateway, not a silent no-op', async () => {
  const client = fakeProfileWrites({ sendStatus: 500 })
  await expect(
    caller({ ...BASE, poracleClient: client }).switchProfile({
      profileNo: 1,
    }),
  ).rejects.toThrow(/could not be saved/i)
})

test('a transport failure fails a profile write as unavailable, not a silent no-op', async () => {
  const client = fakeProfileWrites({ sendThrows: true })
  await expect(
    caller({ ...BASE, poracleClient: client }).deleteProfile({
      profileNo: 1,
    }),
  ).rejects.toThrow(/could not be saved/i)
})

test('addProfile also fails loudly on a transport failure', async () => {
  // The one procedure of the five with no snapshot read of its own
  // (`requireClientAndPlatform` rather than `beginProfileSession`), so its
  // failure path is worth its own check rather than assuming it shares
  // `deleteProfile`'s.
  const client = fakeProfileWrites({ sendThrows: true })
  await expect(
    caller({ ...BASE, poracleClient: client }).addProfile({ name: 'work' }),
  ).rejects.toThrow(/could not be saved/i)
})
