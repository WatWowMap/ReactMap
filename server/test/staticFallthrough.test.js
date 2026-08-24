const fs = require('fs')
const http = require('http')
const os = require('os')
const path = require('path')
const { afterAll, beforeAll, expect, test } = require('bun:test')
const express = require('express')

const {
  clientRouter,
  LEGACY_SHELL,
  MODERN_SHELL,
  SHELL_FLAG_COLUMN,
} = require('../src/routes/clientRouter')

/**
 * `express.static` is mounted ahead of the router in `server/src/index.js`, and
 * serve-static answers a bare directory request with `index.html` unless told
 * otherwise. That made `/` come off disk as the 1.0 shell for everyone, so the
 * hub at the root was unreachable on a cold load however the flag was set.
 *
 * This mirrors that middleware order against a throwaway dist directory: `/`
 * has to reach the router, and real files still have to be served.
 */

const ASSET = 'assets/index-abc123.js'
const ASSET_BODY = 'console.log("hashed asset")'

let distDir = ''
let server
let port = 0

beforeAll(async () => {
  distDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reactmap-dist-'))
  fs.mkdirSync(path.join(distDir, 'assets'))
  fs.writeFileSync(path.join(distDir, LEGACY_SHELL), 'shell off disk')
  fs.writeFileSync(path.join(distDir, MODERN_SHELL), 'shell off disk')
  fs.writeFileSync(path.join(distDir, ASSET), ASSET_BODY)

  const app = express()
  app.use(express.static(distDir, { dotfiles: 'allow', index: false }))
  app.use((req, res, next) => {
    if (req.headers.flagged === 'yes') {
      req.user = { id: 1, [SHELL_FLAG_COLUMN]: 1 }
    }
    // Reporting the basename separates a router answer from a disk answer,
    // since the files above deliberately do not contain their own names.
    res.sendFile = (filePath) => res.status(200).send(path.basename(filePath))
    next()
  })
  app.use(clientRouter)

  server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))
  port = server.address().port
})

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve))
  fs.rmSync(distDir, { recursive: true, force: true })
})

/**
 * @param {string} url
 * @param {boolean} [flagged]
 */
const request = async (url, flagged) => {
  const res = await fetch(`http://127.0.0.1:${port}${url}`, {
    headers: flagged ? { flagged: 'yes' } : {},
  })
  return res.text()
}

test('a cold load of / reaches the router rather than the disk', async () => {
  expect(await request('/')).toBe(LEGACY_SHELL)
  expect(await request('/', true)).toBe(MODERN_SHELL)
})

test('hashed assets are still served off disk', async () => {
  expect(await request(`/${ASSET}`)).toBe(ASSET_BODY)
})

test('the real middleware stack passes index: false', () => {
  // The stack above is a rebuild, so on its own it would keep passing if
  // someone dropped the option from the server. This pins the actual call.
  const source = fs.readFileSync(require.resolve('../src/index.js'), 'utf8')
  expect(source).toMatch(/express\.static\([^)]*index:\s*false/)
})
