const assert = require('node:assert/strict')
const { test } = require('bun:test')

const { fetchJson } = require('../src/utils/fetchJson')

test('returns parsed JSON on success', async () => {
  const server = Bun.serve({
    port: 0,
    fetch: () => Response.json({ ok: true, value: 42 }),
  })
  const result = await fetchJson(`http://localhost:${server.port}/thing`)
  server.stop()
  assert.deepEqual(result, { ok: true, value: 42 })
})

test('returns the Response on a by-id 404 rather than throwing', async () => {
  const server = Bun.serve({
    port: 0,
    fetch: () => new Response('nope', { status: 404 }),
  })
  const result = await fetchJson(
    `http://localhost:${server.port}/api/pokemon/id/123`,
  )
  server.stop()
  assert.equal(result.status, 404)
})
