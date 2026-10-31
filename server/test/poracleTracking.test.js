const assert = require('node:assert/strict')
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const { test } = require('node:test')

const {
  PoracleAPI,
  toV2ActiveHours,
  fromV2ActiveHours,
} = require('../src/services/Poracle')
const {
  toV1Row,
  fromV1Row,
  isIncidentRow,
  v1Category,
  UnsupportedOnV1,
} = require('../src/services/poracle/v1Adapter')
const {
  createPoracleHttp,
  PoracleRequestError,
} = require('../src/services/poracle/http')
const { createTrackingV2 } = require('../src/services/poracle/trackingV2')
const { createTrackingV1 } = require('../src/services/poracle/trackingV1')

test('v1 adapter: pokemon wildcards become sentinels', () => {
  const rule = {
    pokemon_id: 25,
    min_iv: 90,
    max_iv: null,
    gender: 'female',
    size: null,
    clean: true,
    edit: true,
    summary: false,
  }
  const row = toV1Row('pokemon', rule)
  assert.partialDeepStrictEqual(row, {
    pokemon_id: 25,
    min_iv: 90,
    max_iv: 100,
    gender: 2,
    size: -1,
    max_size: 5,
    max_weight: 9000000,
    pvp_ranking_worst: 4096,
    costume: 9000,
    clean: 3,
  })
  const back = fromV1Row('pokemon', row)
  assert.equal(back.pokemon_id, 25)
  assert.equal(back.min_iv, 90)
  assert.equal(back.max_iv, null)
  assert.equal(back.gender, 'female')
  assert.equal(back.size, null)
  assert.equal(back.costume, null)
  assert.equal(back.max_weight, null)
  assert.equal(back.pvp_ranking_worst, null)
  assert.equal(back.clean, true)
  assert.equal(back.edit, true)
  assert.equal(back.summary, false)
  // a complete rule: re-encoding it is stable
  assert.deepEqual(toV1Row('pokemon', back), row)
  Object.entries(rule).forEach(([k, v]) => {
    if (v !== null) assert.equal(back[k], v)
  })
})

test('v1 adapter: raid boss, level and everything', () => {
  assert.partialDeepStrictEqual(
    toV1Row('raid', { pokemon_id: 150, level: null }),
    { pokemon_id: 150, level: 9000 },
  )
  assert.partialDeepStrictEqual(
    toV1Row('raid', { pokemon_id: null, level: 5, team: 'mystic' }),
    { pokemon_id: 9000, level: 5, team: 1 },
  )
  assert.equal(toV1Row('raid', { pokemon_id: null, level: null }).level, 90)

  const boss = fromV1Row('raid', { pokemon_id: 150, level: 9000, team: 4 })
  assert.equal(boss.pokemon_id, 150)
  assert.equal(boss.level, null)
  assert.equal(boss.team, null)
  const tier = fromV1Row('raid', { pokemon_id: 9000, level: 5, team: 1 })
  assert.equal(tier.pokemon_id, null)
  assert.equal(tier.level, 5)
  assert.equal(tier.team, 'mystic')
  const all = fromV1Row('raid', { pokemon_id: 9000, level: 90 })
  assert.equal(all.pokemon_id, null)
  assert.equal(all.level, null)
})

test('v1 adapter: incident is an invasion row on v1', () => {
  assert.partialDeepStrictEqual(
    toV1Row('incident', { display_type: 9, clean: true }),
    { grunt_type: 'showcase', gender: 0, clean: 1 },
  )
  assert.partialDeepStrictEqual(
    fromV1Row('incident', { uid: 3, grunt_type: 'kecleon' }),
    { uid: 3, display_type: 8 },
  )
  assert.equal(isIncidentRow({ grunt_type: 'gold-stop' }), true)
  assert.equal(isIncidentRow({ grunt_type: 'water' }), false)
  assert.equal(v1Category('incident'), 'invasion')
  assert.equal(v1Category('raid'), 'raid')
})

test('v1 adapter: unknown event type is unsupported', () => {
  assert.throws(
    () => toV1Row('incident', { display_type: 12 }),
    (e) =>
      e instanceof UnsupportedOnV1 &&
      e.field === 'display_type' &&
      e.category === 'incident' &&
      e.message ===
        "This Poracle server doesn't support display_type on incident rules.",
  )
})

test('v1 round trip keeps NG-only fields', () => {
  const rule = fromV1Row('pokemon', {
    uid: 1,
    pokemon_id: 25,
    clean: 3,
    costume: 4,
    override_areas: ['town'],
    pvp_ranking_league: 1500,
    pvp_ranking_evolution: 1,
  })
  assert.partialDeepStrictEqual(rule, {
    costume: 4,
    override_areas: ['town'],
    pvp_ranking_evolution: 1,
    clean: true,
    edit: true,
  })
  assert.partialDeepStrictEqual(toV1Row('pokemon', rule), {
    clean: 3,
    costume: 4,
    override_areas: ['town'],
    pvp_ranking_evolution: 1,
    uid: 1,
  })
})

test('v1 adapter: gym team and quest summary', () => {
  assert.partialDeepStrictEqual(
    toV1Row('gym', { team: 'any', slot_changes: true }),
    { team: 4, slot_changes: 1 },
  )
  assert.partialDeepStrictEqual(
    toV1Row('quest', {
      reward_type: 7,
      shiny: true,
      summary: true,
      clean: false,
    }),
    { shiny: 1, clean: 4 },
  )
})

/**
 * @param {{ routes?: Record<string, any> }} [opts]
 */
async function stubPoracle({ routes = {}, spec = null } = {}) {
  /** @type {{ method: string, url: string, body: any }[]} */
  const requests = []
  const server = http.createServer((req, res) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
    })
    req.on('end', () => {
      const { url = '', method = 'GET' } = req
      const reply = (status, body) => {
        res.writeHead(status, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(body))
      }
      if (url === '/openapi.json') return reply(spec ? 200 : 404, spec ?? {})
      if (url === '/api/config/poracleWeb') return reply(200, { version: '9' })
      if (url === '/api/geofence/all/geojson') {
        return reply(200, { geoJSON: { features: [] } })
      }
      if (url.startsWith('/api/config/templates')) {
        return reply(200, { discord: {}, telegram: {} })
      }
      requests.push({ method, url, body: raw ? JSON.parse(raw) : undefined })
      const hit = routes[`${method} ${url.split('?')[0]}`]
      const isCustom = hit && typeof hit.status === 'number'
      res.writeHead(isCustom ? hit.status : 200, {
        'Content-Type': 'application/json',
      })
      res.end(JSON.stringify(isCustom ? hit.body : (hit ?? {})))
    })
  })
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(undefined))
  })
  const { port } = /** @type {import('node:net').AddressInfo} */ (
    server.address()
  )
  const poracleHttp = createPoracleHttp({
    endpoint: `http://127.0.0.1:${port}`,
    secret: 's',
  })
  return {
    requests,
    port,
    client: createTrackingV2(poracleHttp),
    v1: createTrackingV1(poracleHttp),
    close: () =>
      new Promise((resolve) => {
        server.close(resolve)
      }),
  }
}

test('v2 list asks for descriptions and returns rules untouched', async () => {
  const rules = [{ uid: 1, display_type: 9, description: 'Showcase' }]
  const stub = await stubPoracle({
    routes: { 'GET /api/v2/humans/123/tracking/incident': { rules } },
  })
  try {
    assert.deepEqual(await stub.client.list('123', 'incident'), rules)
    assert.equal(
      stub.requests[0].url,
      '/api/v2/humans/123/tracking/incident?include_descriptions=true',
    )
  } finally {
    await stub.close()
  }
})

test('v2 save posts new rules and PUTs edits without uid or description', async () => {
  const stub = await stubPoracle()
  try {
    await stub.client.save('123', 'pokemon', [
      { pokemon_id: 1 },
      {
        uid: 7,
        description: 'x',
        pokemon_id: 25,
        costume: 4,
        override_areas: ['town'],
      },
    ])
    const calls = stub.requests.map((r) => [r.method, r.url, r.body]).sort()
    assert.deepEqual(calls, [
      ['POST', '/api/v2/humans/123/tracking/pokemon', [{ pokemon_id: 1 }]],
      [
        'PUT',
        '/api/v2/humans/123/tracking/pokemon/7',
        { pokemon_id: 25, costume: 4, override_areas: ['town'] },
      ],
    ])
  } finally {
    await stub.close()
  }
})

test('v2 invasion edit keeps only grunt_type', async () => {
  const stub = await stubPoracle()
  try {
    await stub.client.save('123', 'invasion', [
      {
        uid: 2,
        grunt_type: 'water',
        type_id: 11,
        grunt_id: null,
        everything: null,
        boss: null,
        gender: 'male',
      },
    ])
    assert.deepEqual(stub.requests[0].body, {
      grunt_type: 'water',
      gender: 'male',
    })
  } finally {
    await stub.close()
  }
})

test('v2 remove is one bulk delete without a body', async () => {
  const stub = await stubPoracle()
  try {
    await stub.client.remove('123', 'raid', [])
    assert.equal(stub.requests.length, 0)
    await stub.client.remove('123', 'raid', [4, 5])
    assert.deepEqual(stub.requests, [
      {
        method: 'DELETE',
        url: '/api/v2/humans/123/tracking/raid?uid=4,5',
        body: undefined,
      },
    ])
  } finally {
    await stub.close()
  }
})

test('save surfaces problem detail', async () => {
  const stub = await stubPoracle({
    routes: {
      'PUT /api/v2/humans/123/tracking/pokemon/4': {
        status: 409,
        body: { title: 'Conflict', detail: 'would duplicate rule 4' },
      },
    },
  })
  try {
    await assert.rejects(
      stub.client.save('123', 'pokemon', [{ uid: 4, pokemon_id: 1 }]),
      (e) =>
        e instanceof PoracleRequestError &&
        e.status === 409 &&
        e.message === 'would duplicate rule 4',
    )
  } finally {
    await stub.close()
  }
})

test('save surfaces huma validation errors', async () => {
  const stub = await stubPoracle({
    routes: {
      'POST /api/v2/humans/123/tracking/egg': {
        status: 422,
        body: {
          title: 'Unprocessable Entity',
          detail: 'validation failed',
          errors: [
            { message: 'expected number >= 1', location: 'body[0].level' },
            { message: 'expected required property team', location: 'body' },
          ],
        },
      },
    },
  })
  try {
    await assert.rejects(
      stub.client.save('123', 'egg', [{ level: 0 }]),
      (e) =>
        e instanceof PoracleRequestError &&
        e.status === 422 &&
        e.message ===
          'validation failed: body[0].level: expected number >= 1; body: expected required property team',
    )
  } finally {
    await stub.close()
  }
})

test('save surfaces the v1 error message', async () => {
  const stub = await stubPoracle({
    routes: {
      'POST /api/tracking/pokemon/123': {
        status: 400,
        body: { status: 'error', message: 'Invalid profile' },
      },
    },
  })
  try {
    await assert.rejects(
      stub.v1.save('123', 'pokemon', [{ pokemon_id: 25 }]),
      (e) =>
        e instanceof PoracleRequestError &&
        e.status === 400 &&
        e.message === 'Invalid profile',
    )
  } finally {
    await stub.close()
  }
})

test('v1 list splits incidents from invasions', async () => {
  const stub = await stubPoracle({
    routes: {
      'GET /api/tracking/invasion/123': {
        invasion: [
          { uid: 1, grunt_type: 'water', gender: 1 },
          { uid: 2, grunt_type: 'showcase', gender: 0 },
        ],
      },
    },
  })
  try {
    const invasions = await stub.v1.list('123', 'invasion')
    assert.equal(invasions.length, 1)
    assert.partialDeepStrictEqual(invasions[0], {
      uid: 1,
      grunt_type: 'water',
      gender: 'male',
    })
    const incidents = await stub.v1.list('123', 'incident')
    assert.equal(incidents.length, 1)
    assert.partialDeepStrictEqual(incidents[0], { uid: 2, display_type: 9 })
  } finally {
    await stub.close()
  }
})

test('v1 save converts and posts once', async () => {
  const stub = await stubPoracle()
  try {
    await stub.v1.save('123', 'pokemon', [
      { uid: 7, pokemon_id: 25, min_iv: null, clean: true },
    ])
    assert.equal(stub.requests.length, 1)
    assert.equal(stub.requests[0].method, 'POST')
    assert.equal(stub.requests[0].url, '/api/tracking/pokemon/123')
    assert.equal(stub.requests[0].body.length, 1)
    assert.partialDeepStrictEqual(stub.requests[0].body[0], {
      uid: 7,
      min_iv: -1,
      clean: 1,
    })
  } finally {
    await stub.close()
  }
})

test('v1 incident save goes to invasion', async () => {
  const stub = await stubPoracle()
  try {
    await stub.v1.save('123', 'incident', [{ display_type: 7 }])
    assert.equal(stub.requests[0].url, '/api/tracking/invasion/123')
    assert.equal(stub.requests[0].body[0].grunt_type, 'gold-stop')
  } finally {
    await stub.close()
  }
})

test('v1 save rejects unsupported before sending', async () => {
  const stub = await stubPoracle()
  try {
    await assert.rejects(
      stub.v1.save('123', 'incident', [{ display_type: 12 }]),
      UnsupportedOnV1,
    )
    assert.equal(stub.requests.filter((r) => r.method === 'POST').length, 0)
  } finally {
    await stub.close()
  }
})

test('v1 remove', async () => {
  const stub = await stubPoracle()
  try {
    await stub.v1.remove('123', 'incident', [2])
    assert.equal(stub.requests[0].method, 'POST')
    assert.equal(stub.requests[0].url, '/api/tracking/invasion/123/delete')
    assert.deepEqual(stub.requests[0].body, [2])
  } finally {
    await stub.close()
  }
})

const v2Spec = {
  paths: Object.fromEntries(
    [
      '/v2/humans/{id}',
      '/v2/humans/{id}/areas',
      '/v2/humans/{id}/enable',
      '/v2/humans/{id}/disable',
      '/v2/humans/{id}/location',
      '/v2/humans/{id}/profile',
      '/v2/humans/{id}/profiles',
      '/v2/humans/{id}/profiles/{profile_no}',
      '/v2/humans/{id}/profiles/{profile_no}/copy',
      ...[
        'pokemon',
        'raid',
        'egg',
        'quest',
        'invasion',
        'incident',
        'lure',
        'nest',
        'gym',
      ].flatMap((type) => [
        `/v2/humans/{id}/tracking/${type}`,
        `/v2/humans/{id}/tracking/${type}/{uid}`,
      ]),
    ].map((p) => [p, {}]),
  ),
}

/** @param {number} port @param {string} name */
async function initApi(port, name, apiVersion = undefined) {
  const api = new PoracleAPI({
    name,
    host: 'http://127.0.0.1',
    port,
    enabled: true,
    apiVersion,
  })
  await api.init()
  fs.rmSync(path.join(__dirname, '../.cache', `${name}-webhook.json`), {
    force: true,
  })
  return api
}

test('api routes tracking through the v2 client', async () => {
  const stub = await stubPoracle({
    spec: v2Spec,
    routes: {
      'GET /api/v2/humans/123/tracking/incident': {
        rules: [{ uid: 3, display_type: 9 }],
      },
    },
  })
  try {
    const api = await initApi(stub.port, 'trk-v2')
    const result = await api.api('123', 'incident', 'POST', [
      { display_type: 9 },
    ])
    assert.equal(stub.requests[0].method, 'POST')
    assert.equal(stub.requests[0].url, '/api/v2/humans/123/tracking/incident')
    assert.deepEqual(result, {
      status: 'ok',
      incident: [{ uid: 3, display_type: 9 }],
    })
  } finally {
    await stub.close()
  }
})

test('api returns status error with the current rules', async () => {
  const stub = await stubPoracle({
    spec: v2Spec,
    routes: {
      'PUT /api/v2/humans/123/tracking/pokemon/7': {
        status: 409,
        body: { title: 'Conflict', detail: 'would duplicate rule 4' },
      },
      'GET /api/v2/humans/123/tracking/pokemon': {
        rules: [{ uid: 7, pokemon_id: 25 }],
      },
    },
  })
  try {
    const api = await initApi(stub.port, 'trk-err')
    const result = await api.api('123', 'pokemon', 'POST', [
      { uid: 7, pokemon_id: 25 },
    ])
    assert.equal(result.status, 'error')
    assert.equal(result.message, 'would duplicate rule 4')
    assert.deepEqual(result.pokemon, [{ uid: 7, pokemon_id: 25 }])
  } finally {
    await stub.close()
  }
})

test('api returns the v1 adapter error', async () => {
  const stub = await stubPoracle()
  try {
    const api = await initApi(stub.port, 'trk-v1err')
    assert.equal(api.v2, false)
    const result = await api.api('123', 'incident', 'POST', [
      { display_type: 12 },
    ])
    assert.equal(result.status, 'error')
    assert.ok(result.message)
    assert.ok(Array.isArray(result.incident))
  } finally {
    await stub.close()
  }
})

test('an unreachable server is a generic error without its URL', async () => {
  const stub = await stubPoracle({ spec: v2Spec })
  const api = await initApi(stub.port, 'trk-down')
  await stub.close()
  const result = await api.api('123', 'pokemon', 'POST', [{ pokemon_id: 25 }])
  assert.equal(result.status, 'error')
  assert.equal(result.message, 'Poracle server unreachable')
  assert.ok(!result.message.includes('127.0.0.1'))
  assert.deepEqual(result.pokemon, [])
})

test('quick gym on v2 posts raid, egg and gym rules', async () => {
  const gym = [{ uid: 9, team: 'any', gym_id: 'g1' }]
  const stub = await stubPoracle({
    spec: v2Spec,
    routes: { 'GET /api/v2/humans/123/tracking/gym': { rules: gym } },
  })
  try {
    const api = await initApi(stub.port, 'trk-qg2')
    const result = await api.api('123', 'quickGym', 'POST', 'g1')
    const posts = Object.fromEntries(
      stub.requests
        .filter((r) => r.method === 'POST')
        .map((r) => [r.url, r.body]),
    )
    assert.deepEqual(posts, {
      '/api/v2/humans/123/tracking/raid': [{ gym_id: 'g1' }],
      '/api/v2/humans/123/tracking/egg': [{ level: 90, gym_id: 'g1' }],
      '/api/v2/humans/123/tracking/gym': [
        {
          team: 'any',
          slot_changes: true,
          battle_changes: api.gymBattles,
          gym_id: 'g1',
        },
      ],
    })
    assert.deepEqual(result, { status: 'ok', gym })
  } finally {
    await stub.close()
  }
})

test('quick gym on v1 posts converted raid, egg and gym rows', async () => {
  const stub = await stubPoracle({
    routes: {
      'GET /api/tracking/gym/123': {
        gym: [{ uid: 9, team: 4, gym_id: 'g1', slot_changes: 1 }],
      },
    },
  })
  try {
    const api = await initApi(stub.port, 'trk-qg1')
    assert.equal(api.v2, false)
    const result = await api.api('123', 'quickGym', 'POST', 'g1')
    const posts = Object.fromEntries(
      stub.requests
        .filter((r) => r.method === 'POST')
        .map((r) => [r.url, r.body]),
    )
    assert.deepEqual(Object.keys(posts).sort(), [
      '/api/tracking/egg/123',
      '/api/tracking/gym/123',
      '/api/tracking/raid/123',
    ])
    assert.partialDeepStrictEqual(posts['/api/tracking/raid/123'], [
      { gym_id: 'g1', pokemon_id: 9000, level: 90 },
    ])
    assert.partialDeepStrictEqual(posts['/api/tracking/egg/123'], [
      { gym_id: 'g1', level: 90 },
    ])
    assert.partialDeepStrictEqual(posts['/api/tracking/gym/123'], [
      { gym_id: 'g1', team: 4, slot_changes: 1 },
    ])
    assert.equal(result.status, 'ok')
    assert.partialDeepStrictEqual(result.gym, [
      { uid: 9, team: 'any', gym_id: 'g1' },
    ])
  } finally {
    await stub.close()
  }
})

test('capabilities follow the API version', async () => {
  const ng = await stubPoracle({ spec: v2Spec })
  const legacy = await stubPoracle()
  try {
    const v2 = await initApi(ng.port, 'cap-v2')
    const v1 = await initApi(legacy.port, 'cap-v1')
    assert.deepEqual(v2.getClientContext('discord').capabilities, {
      edit: true,
      summary: true,
    })
    assert.deepEqual(v1.getClientContext('discord').capabilities, {
      edit: false,
      summary: false,
    })
  } finally {
    await Promise.all([ng.close(), legacy.close()])
  }
})

test('stepped active hours survive the v2 round trip', () => {
  const stepped = {
    day: 1,
    hours: 8,
    mins: 0,
    step: 2,
    end_hours: 20,
    end_mins: 0,
  }
  const [entry] = fromV2ActiveHours([stepped])
  assert.deepEqual(toV2ActiveHours([{ ...entry, id: '1_0' }]), [stepped])
  // GraphQL sends null for the range fields of a single entry.
  assert.deepEqual(
    toV2ActiveHours([
      { day: 2, hours: '09', mins: '30', step: null, end_hours: null },
    ]),
    [{ day: 2, hours: 9, mins: 30 }],
  )
})

test('active hours convert to v2 integers and back to padded strings', () => {
  assert.deepEqual(
    toV2ActiveHours([{ day: 1, hours: '09', mins: '05', id: '1_0' }]),
    [{ day: 1, hours: 9, mins: 5 }],
  )
  assert.deepEqual(fromV2ActiveHours([{ day: 7, hours: 9, mins: 5 }]), [
    { day: 7, hours: '09', mins: '05' },
  ])
})

test('auto detects v2 from the OpenAPI spec, v1 without one', async () => {
  const ng = await stubPoracle({ spec: v2Spec })
  const legacy = await stubPoracle()
  const partial = await stubPoracle({
    spec: { paths: { '/v2/humans/{id}': {} } },
  })
  try {
    assert.equal((await initApi(ng.port, 'det-ng')).v2, true)
    assert.equal((await initApi(legacy.port, 'det-legacy')).v2, false)
    assert.equal((await initApi(partial.port, 'det-partial')).v2, false)
    // An explicit version skips the probe.
    assert.equal((await initApi(ng.port, 'det-forced', 'v1')).v2, false)
  } finally {
    await Promise.all([ng.close(), legacy.close(), partial.close()])
  }
})

test('v2 profile update sends only typed active hours', async () => {
  const stub = await stubPoracle({
    spec: v2Spec,
    routes: {
      'GET /api/v2/humans/123/profiles': {
        profiles: [
          {
            uid: 9,
            profile_no: 1,
            name: 'home',
            area: ['town'],
            active_hours: [{ day: 2, hours: 8, mins: 0 }],
          },
        ],
      },
    },
  })
  try {
    const api = await initApi(stub.port, 'trk-profile')
    const { profile } = await api.api('123', 'profiles-update', 'POST', {
      uid: 9,
      profile_no: 1,
      name: 'home',
      area: ['town'],
      active_hours: [{ day: 2, hours: '08', mins: '00', id: '9_0' }],
    })
    const patch = stub.requests.find((r) => r.method === 'PATCH')
    assert.equal(patch.url, '/api/v2/humans/123/profiles/1')
    assert.deepEqual(patch.body, {
      active_hours: [{ day: 2, hours: 8, mins: 0 }],
    })
    assert.deepEqual(profile[0].area, ['town'])
    assert.deepEqual(profile[0].active_hours, [
      { day: 2, hours: '08', mins: '00', id: '9_0' },
    ])
  } finally {
    await stub.close()
  }
})

test('a cached v2 result does not override a configured apiVersion', () => {
  const name = 'v2-cache-override'
  const file = path.join(__dirname, '../.cache', `${name}-webhook.json`)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify({ apiVersion: 'auto', v2: true }))
  try {
    const forced = new PoracleAPI({
      name,
      host: 'http://x',
      port: 1,
      apiVersion: 'v1',
    })
    forced.initFromCache()
    assert.equal(forced.apiVersion, 'v1')
    assert.equal(forced.v2, false)

    const auto = new PoracleAPI({ name, host: 'http://x', port: 1 })
    auto.initFromCache()
    assert.equal(auto.v2, true)
  } finally {
    fs.rmSync(file, { force: true })
  }
})

test('v1 profile update keeps stepped active hours', async () => {
  const stub = await stubPoracle({
    routes: { 'GET /api/profiles/123': { profile: [] } },
  })
  try {
    const api = await initApi(stub.port, 'trk-steps')
    await api.api('123', 'profiles-update', 'POST', {
      uid: 9,
      profile_no: 1,
      active_hours: [
        { day: 1, hours: '8', mins: '0', step: 2, end_hours: 20, end_mins: 0 },
        { day: 2, hours: '9', mins: '30', step: null, end_hours: null },
      ],
    })
    const post = stub.requests.find((r) => r.method === 'POST')
    assert.deepEqual(post.body.active_hours, [
      { day: 1, hours: '08', mins: '00', step: 2, end_hours: 20, end_mins: 0 },
      { day: 2, hours: '09', mins: '30' },
    ])
  } finally {
    await stub.close()
  }
})

test('generateUi is v2-shaped', () => {
  const api = new PoracleAPI({ name: 'ui', host: 'http://x', port: 1 })
  const ui = api.generateUi()
  assert.equal(ui.pokemon.defaults.min_iv, null)
  assert.equal(ui.pokemon.defaults.gender, null)
  assert.equal(ui.pokemon.defaults.clean, false)
  assert.equal(ui.pokemon.defaults.edit, false)
  assert.equal(ui.gym.defaults.team, 'any')
  assert.equal(ui.raid.defaults.team, null)
  assert.equal(ui.raid.defaults.level, null)
  assert.equal(ui.raid.defaults.pokemon_id, null)
  assert.equal(ui.egg.defaults.level, 90)
  assert.equal(ui.incident.defaults.display_type, null)
  assert.deepEqual(ui.incident.identifiers, ['display_type'])
  const iv = ui.pokemon.ui.primary.sliders.find((s) => s.name === 'iv')
  assert.equal(iv.anyLow, true)
  assert.equal(iv.anyHigh, true)
  const pvp = ui.pokemon.ui.pvp.sliders.find((s) => s.name === 'pvp')
  assert.equal(pvp.anyLow, false)
  assert.equal(pvp.anyHigh, false)
  const names = (cat) => ui[cat].ui.general.booleans.map((b) => b.name)
  assert.ok(names('quest').includes('summary'))
  assert.ok(names('raid').includes('edit'))
  assert.deepEqual(
    ui.pokemon.ui.general.selects.find((s) => s.name === 'gender').options,
    [null, 'male', 'female'],
  )
})
