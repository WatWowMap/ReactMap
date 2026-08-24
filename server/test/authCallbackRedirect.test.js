const http = require('http')
const { afterAll, beforeAll, expect, test } = require('bun:test')
const express = require('express')

const { authRouter } = require('../src/routes/authRouter')

/**
 * Operators have `/auth/:provider/callback` registered with their OAuth
 * application. Better Auth serves `/api/auth/callback/:provider` instead, so
 * this redirect bridges the two. The query string carries the OAuth `code`
 * and `state`, so losing it turns a working redirect into a silent
 * authentication failure -- that is the case this test exists to catch.
 */

let server
let port = 0

beforeAll(async () => {
  const app = express()
  app.use('/auth', authRouter)
  server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))
  port = server.address().port
})

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve))
})

test('the legacy callback redirects to the better auth callback path', async () => {
  const res = await fetch(
    `http://localhost:${port}/auth/discord/callback?code=abc&state=xyz`,
    { redirect: 'manual' },
  )
  expect(res.status).toBe(302)
  const location = res.headers.get('location')
  expect(location).toBe('/api/auth/callback/discord?code=abc&state=xyz')
})

test('the query string survives intact, since that is where code and state live', async () => {
  const res = await fetch(
    `http://localhost:${port}/auth/telegram/callback?code=zzz&state=aaa&extra=1`,
    { redirect: 'manual' },
  )
  const location = res.headers.get('location')
  expect(location).toContain('code=zzz')
  expect(location).toContain('state=aaa')
  expect(location).toContain('extra=1')
})

test('a callback with no query string still redirects cleanly', async () => {
  const res = await fetch(`http://localhost:${port}/auth/discord/callback`, {
    redirect: 'manual',
  })
  expect(res.status).toBe(302)
  expect(res.headers.get('location')).toBe('/api/auth/callback/discord')
})
