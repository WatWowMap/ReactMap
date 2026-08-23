// @ts-check
const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const { once } = require('node:events')
const {
  afterAll,
  afterEach,
  beforeAll,
  mock,
  spyOn,
  test,
} = require('bun:test')

const config = require('@rm/config')

const { load } = require('../lib')

const remoteMasterfile = {
  pokemon: {
    25: {
      name: 'Pikachu',
      pokedexId: 25,
      defaultFormId: 0,
      types: [13],
      quickMoves: [],
      chargedMoves: [],
      genId: 1,
      forms: { 0: { name: 'Normal' } },
    },
  },
  types: {},
  items: {},
  questRewardTypes: {},
  moves: {},
  invasions: {},
  weather: {},
  teams: {},
  raids: {},
  routeTypes: {},
  locationCards: {},
}

/** @type {http.Server} */
let server
let baseUrl
let requestCount = 0

beforeAll(async () => {
  server = http.createServer((req, res) => {
    requestCount += 1
    if (req.url === '/failure') {
      res.writeHead(503, 'Service Unavailable')
      res.end()
      return
    }
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify(remoteMasterfile))
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Unable to determine test server address')
  }
  baseUrl = `http://127.0.0.1:${address.port}`
})

afterAll(async () => {
  const closed = once(server, 'close')
  server.close()
  await closed
})

/**
 * @param {string} endpoint
 */
const mockEndpoint = (endpoint) => {
  const getSafe = config.getSafe.bind(config)
  spyOn(config, 'getSafe').mockImplementation((key) => {
    if (key === 'api.pogoApiEndpoints.masterfile') return endpoint
    if (key === 'rarity') return {}
    return getSafe(key)
  })
}

afterEach(() => {
  mock.restore()
})

test('load returns a valid cached masterfile without generating', async () => {
  spyOn(fs, 'readFileSync').mockImplementation(() =>
    JSON.stringify(remoteMasterfile),
  )
  spyOn(config, 'getSafe').mockImplementation(() => {
    throw new Error('generation should not run for a valid cache')
  })

  assert.deepEqual(await load(), remoteMasterfile)
})

test('load awaits generation when the cache is missing', async () => {
  requestCount = 0
  spyOn(fs, 'readFileSync').mockImplementation(() => {
    throw Object.assign(new Error('cache missing'), { code: 'ENOENT' })
  })
  /** @type {Parameters<typeof fs.promises.writeFile> | null} */
  let writeArgs = null
  spyOn(fs.promises, 'writeFile').mockImplementation(async (...args) => {
    writeArgs = args
  })
  mockEndpoint(`${baseUrl}/success`)

  const masterfile = await load()

  assert.equal(masterfile.pokemon[25].name, 'Pikachu')
  assert.equal(requestCount, 1)
  assert.ok(writeArgs)
  assert.equal(path.basename(writeArgs[0].toString()), 'masterfile.json')
  assert.equal(JSON.parse(writeArgs[1].toString()).pokemon[25].name, 'Pikachu')
})

test('load rejects when cache recovery generation fails', async () => {
  requestCount = 0
  spyOn(fs, 'readFileSync').mockImplementation(() => {
    throw Object.assign(new Error('cache missing'), { code: 'ENOENT' })
  })
  let writeCount = 0
  spyOn(fs.promises, 'writeFile').mockImplementation(async () => {
    writeCount += 1
  })
  mockEndpoint(`${baseUrl}/failure`)

  await assert.rejects(load(), /503 Service Unavailable/)
  assert.equal(requestCount, 1)
  assert.equal(writeCount, 0)
})

test('CLI exits nonzero without logging OK when generation fails', async () => {
  requestCount = 0
  const child = spawn(
    process.execPath,
    [path.join(__dirname, '../lib/index.js')],
    {
      env: {
        ...process.env,
        API_POGO_API_ENDPOINTS_MASTERFILE: `${baseUrl}/failure`,
        FORCE_COLOR: '0',
      },
    },
  )
  let output = ''
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', (data) => {
    output += data
  })
  child.stderr.on('data', (data) => {
    output += data
  })

  const [exitCode] = await once(child, 'close')

  assert.equal(exitCode, 1)
  assert.equal(requestCount, 1)
  assert.match(output, /Unable to generate masterfile/)
  assert.doesNotMatch(output, /\[MASTERFILE\] OK/)
})
