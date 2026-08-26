import { expect, test } from 'bun:test'

import { createPoracleClient, poracleConfigured } from './poracle-client'

const CONFIG = {
  enabled: true,
  host: 'http://poracle.test',
  port: 3030,
  poracleSecret: 'shhh',
}

test('sends the secret as a header and never in the URL', async () => {
  let seenUrl = ''
  let seenHeaders: any = {}
  const client = createPoracleClient({
    config: CONFIG,
    fetch: (async (url: any, init: any) => {
      seenUrl = String(url)
      seenHeaders = init.headers
      return new Response('{"ok":true}', { status: 200 })
    }) as any,
  })

  await client.get('/v2/humans/123')

  expect(seenUrl).toBe('http://poracle.test:3030/v2/humans/123')
  expect(seenHeaders['X-Poracle-Secret']).toBe('shhh')
  expect(seenUrl).not.toContain('shhh')
})

test('a 404 is returned as a status, not thrown', async () => {
  // The human check needs to tell 404 (no human) from a transport failure.
  // Throwing on both would collapse two of the three states in spec 6.
  const client = createPoracleClient({
    config: CONFIG,
    fetch: (async () => new Response('{}', { status: 404 })) as any,
  })
  const res = await client.get('/v2/humans/nobody')
  expect(res.status).toBe(404)
})

test('a transport failure throws so it cannot be mistaken for a 404', async () => {
  const client = createPoracleClient({
    config: CONFIG,
    fetch: (async () => {
      throw new Error('ECONNREFUSED')
    }) as any,
  })
  await expect(client.get('/v2/humans/123')).rejects.toThrow()
})

test('a non-2xx body does not echo config or headers back to the caller', async () => {
  const client = createPoracleClient({
    config: CONFIG,
    fetch: (async () => new Response('nope', { status: 500 })) as any,
  })
  const res = await client.get('/v2/humans/123')
  expect(JSON.stringify(res)).not.toContain('shhh')
})

test('a transport failure never carries the secret in its error', async () => {
  const client = createPoracleClient({
    config: CONFIG,
    fetch: (async () => {
      throw new Error('ECONNREFUSED')
    }) as any,
  })

  let caught: unknown
  try {
    await client.get('/v2/humans/123')
  } catch (err) {
    caught = err
  }

  expect(caught).toBeInstanceOf(Error)
  expect((caught as Error).message).not.toContain('shhh')
  expect(JSON.stringify(caught)).not.toContain('shhh')
})

test('send(POST) sets the method, serialises the body, and sends the secret header', async () => {
  let seenMethod = ''
  let seenBody = ''
  let seenHeaders: any = {}
  const client = createPoracleClient({
    config: CONFIG,
    fetch: (async (_url: any, init: any) => {
      seenMethod = init.method
      seenBody = init.body
      seenHeaders = init.headers
      return new Response('{"ok":true}', { status: 200 })
    }) as any,
  })

  await client.send('POST', '/v2/humans/123/tracking/pokemon', { pokemon: [1] })

  expect(seenMethod).toBe('POST')
  expect(seenBody).toBe(JSON.stringify({ pokemon: [1] }))
  expect(seenHeaders['X-Poracle-Secret']).toBe('shhh')
})

test('send(DELETE) with no body does not set a body key on the request init', async () => {
  let seenInit: any = {}
  const client = createPoracleClient({
    config: CONFIG,
    fetch: (async (_url: any, init: any) => {
      seenInit = init
      return new Response('{}', { status: 200 })
    }) as any,
  })

  await client.send('DELETE', '/v2/humans/123')

  // `exactOptionalPropertyTypes` distinguishes "key present with value
  // undefined" from "key absent" -- this is exactly the distinction the
  // implementation's conditional `init.body` assignment exists to preserve.
  expect('body' in seenInit).toBe(false)
})

test('send returns a non-2xx as a status rather than throwing', async () => {
  const client = createPoracleClient({
    config: CONFIG,
    fetch: (async () => new Response('{}', { status: 409 })) as any,
  })
  const res = await client.send('PUT', '/v2/humans/123')
  expect(res.status).toBe(409)
})

test('poracleConfigured is true when enabled with a host and a secret', () => {
  expect(poracleConfigured({ config: CONFIG })).toBe(true)
})

test('poracleConfigured is false when not enabled', () => {
  expect(poracleConfigured({ config: { ...CONFIG, enabled: false } })).toBe(
    false,
  )
})

test('poracleConfigured is false when the secret is missing', () => {
  expect(poracleConfigured({ config: { ...CONFIG, poracleSecret: '' } })).toBe(
    false,
  )
})
