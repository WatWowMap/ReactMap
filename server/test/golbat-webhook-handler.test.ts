import { describe, expect, test } from 'bun:test'
import {
  createGolbatWebhookHandler,
  GOLBAT_WEBHOOK_SECRET_HEADER,
} from '../src/services/golbat-webhook-handler'

function raidBody(gymId = 'g1') {
  return JSON.stringify([
    {
      type: 'raid',
      message: {
        gym_id: gymId,
        latitude: 1,
        longitude: 2,
        level: 5,
        pokemon_id: 150,
      },
    },
  ])
}

function post(body: string, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/webhooks/golbat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  })
}

function fakeRegistry() {
  const batches: any[][] = []
  return {
    batches,
    dispatch(injections: any[]) {
      batches.push(injections)
    },
  }
}

describe('createGolbatWebhookHandler: without a shared secret', () => {
  test('accepts an unauthenticated POST and dispatches what it parsed', async () => {
    const registry = fakeRegistry()
    const handler = createGolbatWebhookHandler({ registry, secret: '' })

    const response = await handler(post(raidBody()))

    expect(response.status).toBeGreaterThanOrEqual(200)
    expect(response.status).toBeLessThan(300)
    expect(registry.batches.length).toBe(1)
    expect(registry.batches[0]?.[0].entity.id).toBe('g1')
  })
})

describe('createGolbatWebhookHandler: with a shared secret', () => {
  test('rejects a POST with no secret header, and dispatches nothing', async () => {
    const registry = fakeRegistry()
    const handler = createGolbatWebhookHandler({ registry, secret: 's3cret' })

    const response = await handler(post(raidBody()))

    expect(response.status).toBe(401)
    expect(registry.batches).toEqual([])
  })

  test('rejects a wrong secret', async () => {
    const registry = fakeRegistry()
    const handler = createGolbatWebhookHandler({ registry, secret: 's3cret' })

    const response = await handler(
      post(raidBody(), { [GOLBAT_WEBHOOK_SECRET_HEADER]: 'nope' }),
    )

    expect(response.status).toBe(401)
    expect(registry.batches).toEqual([])
  })

  test('accepts the right secret', async () => {
    const registry = fakeRegistry()
    const handler = createGolbatWebhookHandler({ registry, secret: 's3cret' })

    const response = await handler(
      post(raidBody(), { [GOLBAT_WEBHOOK_SECRET_HEADER]: 's3cret' }),
    )

    expect(response.status).toBe(202)
    expect(registry.batches.length).toBe(1)
  })

  test("accepts the value Golbat's own un-trimmed header parser produces", async () => {
    // config/reader.go:163-175 splits "X-Foo: bar" on ':' without trimming.
    const registry = fakeRegistry()
    const handler = createGolbatWebhookHandler({ registry, secret: 's3cret' })

    const response = await handler(
      post(raidBody(), { [GOLBAT_WEBHOOK_SECRET_HEADER]: ' s3cret' }),
    )

    expect(response.status).toBe(202)
  })
})

describe('createGolbatWebhookHandler: bad input', () => {
  test('a body that is not JSON is rejected', async () => {
    const registry = fakeRegistry()
    const handler = createGolbatWebhookHandler({ registry, secret: '' })

    const response = await handler(post('not json at all'))

    expect(response.status).toBe(400)
    expect(registry.batches).toEqual([])
  })

  test('a JSON body that is not an array is rejected -- Golbat always sends an array', async () => {
    const registry = fakeRegistry()
    const handler = createGolbatWebhookHandler({ registry, secret: '' })

    const response = await handler(post(JSON.stringify({ type: 'raid' })))

    expect(response.status).toBe(400)
    expect(registry.batches).toEqual([])
  })

  test('a batch of nothing this branch consumes is still accepted', async () => {
    const registry = fakeRegistry()
    const handler = createGolbatWebhookHandler({ registry, secret: '' })

    const response = await handler(
      post(JSON.stringify([{ type: 'weather', message: { s2_cell_id: 1 } }])),
    )

    expect(response.status).toBe(202)
    // Dispatched, but with nothing in it -- the registry's own fan-out
    // short-circuits an empty batch.
    expect(registry.batches).toEqual([[]])
  })
})

describe('createGolbatWebhookHandler: oversized batches', () => {
  test('refuses a batch with more entries than Golbat ever sends', async () => {
    const registry = fakeRegistry()
    const handler = createGolbatWebhookHandler({ registry, secret: '' })
    const body = JSON.stringify(
      Array.from({ length: 20_001 }, (_, i) => ({
        type: 'raid',
        message: { gym_id: `g${i}`, latitude: 1, longitude: 2, level: 5 },
      })),
    )

    const response = await handler(post(body))

    // The fan-out is entries x live subscriptions, and on an
    // unauthenticated endpoint the entry count is whoever is posting.
    expect(response.status).toBe(413)
    expect(registry.batches).toEqual([])
  })

  test('refuses an oversized body without reading it', async () => {
    const registry = fakeRegistry()
    const handler = createGolbatWebhookHandler({ registry, secret: '' })
    const request = post(raidBody())
    // A body big enough that parsing it is itself the attack. The real
    // request would carry this content-length honestly; a lying one is
    // caught by the entry cap instead.
    request.headers.set('content-length', String(64 * 1024 * 1024))

    const response = await handler(request)

    expect(response.status).toBe(413)
    expect(registry.batches).toEqual([])
  })
})
