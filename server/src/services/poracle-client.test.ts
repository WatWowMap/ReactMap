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

  expect(seenUrl).toBe('http://poracle.test:3030/api/v2/humans/123')
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

test('poracleConfigured is true with a blank secret, for a private network', () => {
  // Poracle's own middleware skips the check entirely when its API secret is
  // unset (`if apiSecret == "" { c.Next() }`), so an instance reachable only
  // on a private network legitimately runs without one. Requiring a secret
  // here reported such a deployment as having no Poracle at all, and the tab
  // never rendered.
  expect(poracleConfigured({ config: { ...CONFIG, poracleSecret: '' } })).toBe(
    true,
  )
})

test('poracleConfigured is false without a host', () => {
  // The host is the part that cannot be defaulted. Without it there is
  // nothing to call, which is a different state from calling something that
  // happens to need no secret.
  expect(poracleConfigured({ config: { ...CONFIG, host: '' } })).toBe(false)
})

test('every route lives under the /api group Poracle mounts them on', async () => {
  // PoracleNG registers the whole authenticated surface on r.Group("/api") and
  // its OpenAPI document carries no `servers` entry, so every path in the spec
  // reads /v2/... and the prefix is invisible. Against a live instance
  // /v2/humans/1/tracking is a 404 and /api/v2/humans/1/tracking is a 401.
  //
  // A 404 is the worst possible way to get this wrong: the human check reads
  // one as "this account has no Poracle", so a missing prefix presents as
  // every user being told they are not registered, which looks exactly like
  // the feature working. The prefix lives here, in the base URL, rather than
  // in each caller's path, so no route can be added without it.
  const urls: string[] = []
  const client = createPoracleClient({
    config: CONFIG,
    fetch: (async (url: any) => {
      urls.push(String(url))
      return new Response('{}', { status: 200 })
    }) as any,
  })

  await client.get('/v2/humans/123/tracking')
  await client.send('POST', '/v2/humans/123/tracking/pokemon?silent=true', [])
  await client.send('DELETE', '/v2/humans/123/tracking/pokemon/7')

  expect(urls).toEqual([
    'http://poracle.test:3030/api/v2/humans/123/tracking',
    'http://poracle.test:3030/api/v2/humans/123/tracking/pokemon?silent=true',
    'http://poracle.test:3030/api/v2/humans/123/tracking/pokemon/7',
  ])
})

test('a host with no port still reaches the /api group', async () => {
  let seenUrl = ''
  const client = createPoracleClient({
    config: { ...CONFIG, port: 0 },
    fetch: (async (url: any) => {
      seenUrl = String(url)
      return new Response('{}', { status: 200 })
    }) as any,
  })
  await client.get('/v2/humans/123')
  expect(seenUrl).toBe('http://poracle.test/api/v2/humans/123')
})
