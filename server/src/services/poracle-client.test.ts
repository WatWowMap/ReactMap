import { expect, test } from 'bun:test'

import { createPoracleClient } from './poracle-client'

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

test('the secret never reaches an error message', async () => {
  const client = createPoracleClient({
    config: CONFIG,
    fetch: (async () => new Response('nope', { status: 500 })) as any,
  })
  const res = await client.get('/v2/humans/123')
  expect(JSON.stringify(res)).not.toContain('shhh')
})
