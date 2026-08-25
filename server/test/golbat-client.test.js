const { test, expect, describe, beforeAll, afterAll } = require('bun:test')
const { createGolbatClient } = require('../src/services/golbat-client')
const {
  GolbatUnreachableError,
  GolbatTimeoutError,
  GolbatUnauthorizedError,
  GolbatUnavailableError,
  GolbatMalformedResponseError,
} = require('../src/services/golbat-responses')
const { startFakeGolbat } = require('../acceptance/support/fake-golbat-server')

// ---------------------------------------------------------------------------
// Failure modes, each driven through an injected fetchImpl -- no network, no
// real success anywhere in this block. This is the "does not become an
// unhandled rejection or a hang" contract from the Task 2 brief.
// ---------------------------------------------------------------------------
describe('failure modes (injected fetchImpl, no network)', () => {
  test('no apiUrl configured -> GolbatUnreachableError, without ever calling fetch', async () => {
    let called = false
    const client = createGolbatClient({
      apiUrl: '',
      fetchImpl: async () => {
        called = true
        throw new Error('should not be called')
      },
    })
    await expect(client.getStatus()).rejects.toBeInstanceOf(
      GolbatUnreachableError,
    )
    expect(called).toBe(false)
  })

  test('connection refused / DNS failure -> GolbatUnreachableError', async () => {
    const client = createGolbatClient({
      apiUrl: 'http://127.0.0.1:1',
      fetchImpl: async () => {
        throw new TypeError('fetch failed')
      },
    })
    await expect(client.getStatus()).rejects.toBeInstanceOf(
      GolbatUnreachableError,
    )
  })

  test('a slow Golbat times out -> GolbatTimeoutError, never hangs past timeoutMs', async () => {
    const client = createGolbatClient({
      apiUrl: 'http://127.0.0.1:1',
      timeoutMs: 50,
      fetchImpl: (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted')
            err.name = 'AbortError'
            reject(err)
          })
        }),
    })
    const start = performance.now()
    await expect(client.getStatus()).rejects.toBeInstanceOf(GolbatTimeoutError)
    expect(performance.now() - start).toBeLessThan(1000)
  })

  test('401 -> GolbatUnauthorizedError', async () => {
    const client = createGolbatClient({
      apiUrl: 'http://127.0.0.1:1',
      apiSecret: 'wrong',
      fetchImpl: async () =>
        new Response('invalid or missing X-Golbat-Secret', { status: 401 }),
    })
    await expect(client.getStatus()).rejects.toBeInstanceOf(
      GolbatUnauthorizedError,
    )
  })

  test('503 from a gated endpoint -> GolbatUnavailableError, not local', async () => {
    const client = createGolbatClient({
      apiUrl: 'http://127.0.0.1:1',
      fetchImpl: async () =>
        new Response('fort_in_memory not enabled', { status: 503 }),
    })
    try {
      await client.scanForts({ min: {}, max: {}, gyms: { filters: [] } })
      throw new Error('expected scanForts to reject')
    } catch (e) {
      expect(e).toBeInstanceOf(GolbatUnavailableError)
      expect(e.local).toBe(false)
    }
  })

  test('malformed body (not valid JSON) -> GolbatMalformedResponseError', async () => {
    const client = createGolbatClient({
      apiUrl: 'http://127.0.0.1:1',
      fetchImpl: async () =>
        new Response('<html>not json</html>', { status: 200 }),
    })
    await expect(client.getStatus()).rejects.toBeInstanceOf(
      GolbatMalformedResponseError,
    )
  })

  test('malformed body (valid JSON, wrong shape) -> GolbatMalformedResponseError', async () => {
    const client = createGolbatClient({
      apiUrl: 'http://127.0.0.1:1',
      fetchImpl: async () => Response.json({ pokemon: 'not an array' }),
    })
    await expect(
      client.scanPokemon({ min: {}, max: {} }),
    ).rejects.toBeInstanceOf(GolbatMalformedResponseError)
  })

  test('a known-disabled fort_in_memory refuses scanForts locally, without a network call', async () => {
    let requests = 0
    const client = createGolbatClient({
      apiUrl: 'http://127.0.0.1:1',
      fetchImpl: async () => {
        requests += 1
        return Response.json({
          features: { fort_in_memory: false },
          limits: { max_pokemon_results: 3000, max_fort_results: 9000 },
        })
      },
    })
    await client.init()
    expect(requests).toBe(1)

    try {
      await client.scanForts({ min: {}, max: {}, gyms: { filters: [] } })
      throw new Error('expected scanForts to reject')
    } catch (e) {
      expect(e).toBeInstanceOf(GolbatUnavailableError)
      expect(e.local).toBe(true)
    }
    // No additional network call: the client already knew.
    expect(requests).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Against a real fake Golbat over HTTP (server/acceptance/support/
// fake-golbat-server.js), driving every endpoint this task builds.
// ---------------------------------------------------------------------------
describe('against a fake Golbat (real HTTP)', () => {
  /** @type {ReturnType<typeof startFakeGolbat>} */
  let fakeGolbat

  beforeAll(() => {
    fakeGolbat = startFakeGolbat()
  })

  afterAll(() => {
    fakeGolbat.close()
  })

  test('GET /api/status is parsed into capabilities, and known to the client afterward', async () => {
    fakeGolbat.setStatus({
      features: { fort_in_memory: true },
      limits: { max_pokemon_results: 3000, max_fort_results: 9000 },
    })
    const client = createGolbatClient({ apiUrl: fakeGolbat.url })
    expect(client.isFortInMemoryEnabled()).toBeNull()
    const capabilities = await client.init()
    expect(capabilities).toEqual({
      fortInMemory: true,
      maxPokemonResults: 3000,
      maxFortResults: 9000,
    })
    expect(client.isFortInMemoryEnabled()).toBe(true)
  })

  test('capability detection: fort_in_memory false is known without ever issuing a fort scan', async () => {
    fakeGolbat.setStatus({
      features: { fort_in_memory: false },
      limits: { max_pokemon_results: 3000, max_fort_results: 9000 },
    })
    const client = createGolbatClient({ apiUrl: fakeGolbat.url })
    await client.init()
    expect(client.isFortInMemoryEnabled()).toBe(false)

    fakeGolbat.resetRequestLog()
    await expect(
      client.scanForts({ min: {}, max: {}, gyms: { filters: [] } }),
    ).rejects.toBeInstanceOf(GolbatUnavailableError)
    // The client refused locally -- no request was sent to Golbat at all.
    expect(fakeGolbat.getRequestLog()).toEqual([])

    // Restore for the tests that follow.
    fakeGolbat.setStatus({
      features: { fort_in_memory: true },
      limits: { max_pokemon_results: 3000, max_fort_results: 9000 },
    })
  })

  test('POST /api/pokemon/v3/scan is driven end-to-end and parsed, including limit_reached', async () => {
    fakeGolbat.setPokemonHandler(() => ({
      pokemon: [{ id: '123', pokemon_id: 25, atk_iv: 15, lat: 1, lon: 2 }],
      examined: 40,
      skipped: 3,
      total: 43,
      limit_reached: true,
    }))
    const client = createGolbatClient({ apiUrl: fakeGolbat.url })
    const result = await client.scanPokemon({
      min: { lat: 0, lon: 0 },
      max: { lat: 1, lon: 1 },
      filters: [{ pokemon: [] }],
    })
    expect(result.pokemon).toEqual([
      { id: '123', pokemon_id: 25, atk_iv: 15, lat: 1, lon: 2 },
    ])
    expect(result.limitReached).toBe(true)
    expect(result.examined).toBe(40)
  })

  test('POST /api/fort/scan (combined) is driven end-to-end and parsed', async () => {
    fakeGolbat.setFortHandler(() => ({
      gyms: [{ id: 'g1' }],
      pokestops: [{ id: 'p1' }],
      stations: [],
      examined: 12,
      skipped: 0,
      total: 12,
      limit_reached: false,
    }))
    const client = createGolbatClient({ apiUrl: fakeGolbat.url })
    const result = await client.scanForts({
      min: { lat: 0, lon: 0 },
      max: { lat: 1, lon: 1 },
      gyms: { filters: [] },
      pokestops: { filters: [] },
    })
    expect(result.gyms).toEqual([{ id: 'g1' }])
    expect(result.pokestops).toEqual([{ id: 'p1' }])
    expect(result.limitReached).toBe(false)
  })

  test('cap clamping: requesting more than the reported cap sends the cap, not the request', async () => {
    fakeGolbat.setStatus({
      features: { fort_in_memory: true },
      limits: { max_pokemon_results: 3000, max_fort_results: 9000 },
    })
    fakeGolbat.setPokemonHandler(() => ({
      pokemon: [],
      examined: 0,
      skipped: 0,
      total: 0,
      limit_reached: false,
    }))
    const client = createGolbatClient({ apiUrl: fakeGolbat.url })
    await client.init()
    fakeGolbat.resetRequestLog()
    await client.scanPokemon({
      min: { lat: 0, lon: 0 },
      max: { lat: 1, lon: 1 },
      limit: 50_000,
      filters: [],
    })
    const [sent] = fakeGolbat.getRequestLog()
    expect(sent.path).toBe('/api/pokemon/v3/scan')
    expect(sent.body.limit).toBe(3000)
  })

  test('all five availability endpoints are driven end-to-end and parsed', async () => {
    fakeGolbat.setAvailablePokemonHandler(() => [
      { pokemon_id: 1, form: 0, count: 4 },
    ])
    fakeGolbat.setAvailableGymsHandler(() => ({
      raids: [
        { raid_level: 5, pokemon_id: null, form: null, temp_evolution_id: 0 },
      ],
    }))
    fakeGolbat.setAvailablePokestopsHandler(() => ({
      showcase_focus_filter: true,
      quests: [],
      invasions: [],
      lures: [{ lure_id: 501 }],
      showcases: [],
    }))
    fakeGolbat.setAvailableStationsHandler(() => ({
      battles: [{ battle_level: 3, pokemon_id: null, form: null }],
    }))
    fakeGolbat.setAvailableFortsHandler(() => ({
      pokestops: {
        showcase_focus_filter: true,
        quests: [],
        invasions: [],
        lures: [],
        showcases: [],
      },
      gyms: { raids: [] },
      stations: { battles: [] },
    }))

    const client = createGolbatClient({ apiUrl: fakeGolbat.url })
    expect(await client.getAvailablePokemon()).toEqual([
      { pokemon_id: 1, form: 0, count: 4 },
    ])
    expect((await client.getAvailableGyms()).raids).toHaveLength(1)
    expect((await client.getAvailablePokestops()).lures).toEqual([
      { lure_id: 501 },
    ])
    expect((await client.getAvailableStations()).battles).toHaveLength(1)
    const forts = await client.getAvailableForts()
    expect(forts.gyms).toEqual({ raids: [] })
  })

  test('isSecretConfigured reflects whether a secret was given', async () => {
    expect(
      createGolbatClient({ apiUrl: fakeGolbat.url }).isSecretConfigured(),
    ).toBe(false)
    expect(
      createGolbatClient({
        apiUrl: fakeGolbat.url,
        apiSecret: 'shh',
      }).isSecretConfigured(),
    ).toBe(true)
  })

  test('with a secret configured on both sides, the request succeeds and carries X-Golbat-Secret', async () => {
    fakeGolbat.setSecret('shared-secret')
    fakeGolbat.setStatus({
      features: { fort_in_memory: true },
      limits: { max_pokemon_results: 3000, max_fort_results: 9000 },
    })
    const client = createGolbatClient({
      apiUrl: fakeGolbat.url,
      apiSecret: 'shared-secret',
    })
    await expect(client.getStatus()).resolves.toEqual({
      fortInMemory: true,
      maxPokemonResults: 3000,
      maxFortResults: 9000,
    })
    fakeGolbat.setSecret(null)
  })

  test('a wrong secret against a real secret-enforcing Golbat is a real 401, not a fake one', async () => {
    fakeGolbat.setSecret('shared-secret')
    const client = createGolbatClient({
      apiUrl: fakeGolbat.url,
      apiSecret: 'totally-wrong',
    })
    await expect(client.getStatus()).rejects.toBeInstanceOf(
      GolbatUnauthorizedError,
    )
    fakeGolbat.setSecret(null)
  })
})
