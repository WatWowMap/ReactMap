const assert = require('node:assert/strict')
const { test } = require('node:test')

const { GolbatCapabilities } = require('../src/services/GolbatCapabilities')

const MEM = 'http://golbat-a'

/**
 * Builds a fetch stand-in whose reply can be swapped between calls. `reply` is
 * a function of the url so a test can vary the answer per instance.
 * @param {(url: string, init: any) => { status: number, body?: any, text?: string }} reply
 */
function fakeFetch(reply) {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, init })
    const res = reply(url, init)
    return {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      statusText: '',
      json: async () => {
        if ('body' in res) return res.body
        throw new SyntaxError(`Unexpected token in JSON: ${res.text}`)
      },
    }
  }
  return { fetchImpl, calls }
}

const STATUS_WITH_FILTERS = {
  features: { fort_in_memory: true },
  limits: { max_pokemon_results: 3000, max_fort_results: 9000 },
  filters: { showcase_focus: true, battle_available: true },
}

test('an old Golbat with no status route yields a legacy result without filters', async (t) => {
  const { fetchImpl, calls } = fakeFetch(() => ({ status: 404 }))
  const caps = new GolbatCapabilities({ fetch: fetchImpl })
  t.after(() => caps.stop())

  await caps.discover([{ endpoint: MEM, secret: 's3cret' }])

  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, `${MEM}/api/status`)
  assert.deepEqual(caps.get(MEM), { features: {}, limits: {}, filters: null })
  assert.equal(caps.advertisesFilters(MEM), false)
  assert.equal(caps.supportsFilter(MEM, 'showcase_focus'), false)
})

test('sends the Golbat secret and basic auth headers on the status request', async (t) => {
  const { fetchImpl, calls } = fakeFetch(() => ({
    status: 200,
    body: STATUS_WITH_FILTERS,
  }))
  const caps = new GolbatCapabilities({ fetch: fetchImpl })
  t.after(() => caps.stop())

  await caps.discover([
    {
      endpoint: MEM,
      secret: 's3cret',
      httpAuth: { username: 'u', password: 'p' },
    },
  ])

  assert.equal(calls[0].init.method, 'GET')
  assert.equal(calls[0].init.headers['X-Golbat-Secret'], 's3cret')
  assert.equal(
    calls[0].init.headers.Authorization,
    `Basic ${Buffer.from('u:p').toString('base64')}`,
  )
  assert.equal(calls[0].init.headers.Accept, 'application/json')
})

test('a status body without a filters block records features and limits only', async (t) => {
  const { fetchImpl } = fakeFetch(() => ({
    status: 200,
    body: {
      features: { fort_in_memory: true },
      limits: { max_pokemon_results: 3000, max_fort_results: 9000 },
    },
  }))
  const caps = new GolbatCapabilities({ fetch: fetchImpl })
  t.after(() => caps.stop())

  await caps.discover([{ endpoint: MEM }])

  assert.deepEqual(caps.get(MEM), {
    features: { fort_in_memory: true },
    limits: { max_pokemon_results: 3000, max_fort_results: 9000 },
    filters: null,
  })
  assert.equal(caps.advertisesFilters(MEM), false)
  assert.equal(caps.supportsFilter(MEM, 'showcase_focus'), false)
})

test('a status body with a filters block advertises the keys it lists', async (t) => {
  const { fetchImpl } = fakeFetch(() => ({
    status: 200,
    body: STATUS_WITH_FILTERS,
  }))
  const caps = new GolbatCapabilities({ fetch: fetchImpl })
  t.after(() => caps.stop())

  await caps.discover([{ endpoint: MEM }])

  assert.deepEqual(caps.get(MEM), STATUS_WITH_FILTERS)
  assert.equal(caps.advertisesFilters(MEM), true)
  assert.equal(caps.supportsFilter(MEM, 'showcase_focus'), true)
  assert.equal(caps.supportsFilter(MEM, 'battle_available'), true)
  assert.equal(caps.supportsFilter(MEM, 'not_a_filter'), false)
})

test('a 2xx that is not JSON counts as an old Golbat, not an outage', async (t) => {
  const { fetchImpl } = fakeFetch(() => ({
    status: 200,
    text: '<html>not golbat</html>',
  }))
  const caps = new GolbatCapabilities({ fetch: fetchImpl })
  t.after(() => caps.stop())

  await caps.discover([{ endpoint: MEM }])

  assert.deepEqual(caps.get(MEM), { features: {}, limits: {}, filters: null })
})

test('a transient failure keeps the last good result', async (t) => {
  let reply = { status: 200, body: STATUS_WITH_FILTERS }
  const { fetchImpl } = fakeFetch(() => reply)
  const caps = new GolbatCapabilities({ fetch: fetchImpl })
  t.after(() => caps.stop())

  await caps.discover([{ endpoint: MEM }])
  assert.equal(caps.supportsFilter(MEM, 'showcase_focus'), true)

  reply = { status: 500, text: 'boom' }
  await caps.refresh(MEM)
  assert.equal(caps.supportsFilter(MEM, 'showcase_focus'), true)

  reply = { status: 401, text: 'bad secret' }
  await caps.refresh(MEM)
  assert.equal(caps.supportsFilter(MEM, 'showcase_focus'), true)

  const networkError = async () => {
    throw new Error('ECONNREFUSED')
  }
  caps.fetch = networkError
  await caps.refresh(MEM)
  assert.deepEqual(caps.get(MEM), STATUS_WITH_FILTERS)
})

test('a transient failure before any success leaves the instance unknown', async (t) => {
  const { fetchImpl } = fakeFetch(() => ({ status: 503, text: 'starting' }))
  const caps = new GolbatCapabilities({ fetch: fetchImpl })
  t.after(() => caps.stop())

  await caps.discover([{ endpoint: MEM }])

  assert.equal(caps.get(MEM), null)
  assert.equal(caps.advertisesFilters(MEM), false)
  assert.equal(caps.supportsFilter(MEM, 'showcase_focus'), false)
})

test('a refresh after a Golbat upgrade picks up the new filters block', async (t) => {
  let reply = { status: 404 }
  const { fetchImpl } = fakeFetch(() => reply)
  const caps = new GolbatCapabilities({ fetch: fetchImpl })
  t.after(() => caps.stop())

  await caps.discover([{ endpoint: MEM }])
  assert.equal(caps.advertisesFilters(MEM), false)

  reply = { status: 200, body: STATUS_WITH_FILTERS }
  await caps.refresh(MEM)
  assert.equal(caps.advertisesFilters(MEM), true)
  assert.equal(caps.supportsFilter(MEM, 'showcase_focus'), true)
})

test('a request that exceeds the fetch timeout is aborted and keeps the last good result', async (t) => {
  const reply = { status: 200, body: STATUS_WITH_FILTERS }
  const { fetchImpl } = fakeFetch(() => reply)
  const hanging = (url, init) =>
    new Promise((_, reject) => {
      init.signal.addEventListener('abort', () =>
        reject(new Error('The operation was aborted')),
      )
    })
  const caps = new GolbatCapabilities({ fetch: fetchImpl, timeoutMs: 5 })
  t.after(() => caps.stop())

  await caps.discover([{ endpoint: MEM }])
  caps.fetch = hanging
  await caps.refresh(MEM)

  assert.deepEqual(caps.get(MEM), STATUS_WITH_FILTERS)
})

test('rediscovery drops instances that are no longer configured and keeps the rest', async (t) => {
  const OTHER = 'http://golbat-b'
  const { fetchImpl, calls } = fakeFetch((url) => ({
    status: url.startsWith(OTHER) ? 404 : 200,
    body: STATUS_WITH_FILTERS,
  }))
  const caps = new GolbatCapabilities({ fetch: fetchImpl })
  t.after(() => caps.stop())

  await caps.discover([
    { endpoint: MEM },
    { endpoint: OTHER },
    { endpoint: OTHER },
  ])
  assert.equal(calls.length, 2)
  assert.equal(caps.supportsFilter(MEM, 'showcase_focus'), true)
  assert.equal(caps.advertisesFilters(OTHER), false)

  await caps.discover([{ endpoint: OTHER }])
  assert.equal(caps.get(MEM), null)
  assert.equal(caps.get(OTHER) !== null, true)
})

test('discovery starts a periodic refresh that stop() cancels', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] })
  const { fetchImpl, calls } = fakeFetch(() => ({
    status: 200,
    body: STATUS_WITH_FILTERS,
  }))
  const caps = new GolbatCapabilities({ fetch: fetchImpl })
  t.after(() => caps.stop())

  await caps.discover([{ endpoint: MEM }, { endpoint: 'http://golbat-b' }])
  assert.equal(calls.length, 2)

  t.mock.timers.tick(GolbatCapabilities.REFRESH_MS - 1)
  assert.equal(calls.length, 2)
  t.mock.timers.tick(1)
  assert.equal(calls.length, 4)

  caps.stop()
  t.mock.timers.tick(GolbatCapabilities.REFRESH_MS)
  assert.equal(calls.length, 4)
})

test('concurrent refreshes of one instance share a single request', async (t) => {
  let release
  const gate = new Promise((resolve) => {
    release = resolve
  })
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, init })
    await gate
    return {
      ok: true,
      status: 200,
      statusText: '',
      json: async () => STATUS_WITH_FILTERS,
    }
  }
  const caps = new GolbatCapabilities({ fetch: fetchImpl })
  t.after(() => caps.stop())
  caps.instances.set(MEM, {
    mem: MEM,
    secret: '',
    httpAuth: null,
    status: null,
  })

  const first = caps.refresh(MEM)
  const second = caps.refresh(MEM)
  release()
  await Promise.all([first, second])

  assert.equal(calls.length, 1)
  assert.equal(caps.supportsFilter(MEM, 'showcase_focus'), true)
})

test('recheck refreshes immediately but at most once per debounce window', async (t) => {
  let now = 1_000_000
  const { fetchImpl, calls } = fakeFetch(() => ({
    status: 200,
    body: STATUS_WITH_FILTERS,
  }))
  const caps = new GolbatCapabilities({ fetch: fetchImpl, now: () => now })
  t.after(() => caps.stop())

  await caps.discover([{ endpoint: MEM }])
  assert.equal(calls.length, 1)

  now += GolbatCapabilities.RECHECK_DEBOUNCE_MS
  await caps.recheck(MEM)
  assert.equal(calls.length, 2)

  await caps.recheck(MEM)
  assert.equal(calls.length, 2)

  now += GolbatCapabilities.RECHECK_DEBOUNCE_MS - 1
  await caps.recheck(MEM)
  assert.equal(calls.length, 2)

  now += 1
  await caps.recheck(MEM)
  assert.equal(calls.length, 3)

  await caps.recheck('http://not-configured')
  assert.equal(calls.length, 3)
})

test('a changed status is logged at info and an unchanged refresh is not', async (t) => {
  let reply = { status: 404 }
  const { fetchImpl } = fakeFetch(() => reply)
  const caps = new GolbatCapabilities({ fetch: fetchImpl })
  t.after(() => caps.stop())
  const info = t.mock.method(caps.log, 'info', () => {})

  await caps.discover([{ endpoint: MEM }])
  assert.equal(info.mock.callCount(), 1)
  assert.match(String(info.mock.calls[0].arguments[0]), /no filters block/)

  await caps.refresh(MEM)
  assert.equal(info.mock.callCount(), 1)

  reply = { status: 200, body: STATUS_WITH_FILTERS }
  await caps.refresh(MEM)
  assert.equal(info.mock.callCount(), 2)
  assert.match(
    String(info.mock.calls[1].arguments[0]),
    /showcase_focus, battle_available/,
  )

  await caps.refresh(MEM)
  assert.equal(info.mock.callCount(), 2)
})
