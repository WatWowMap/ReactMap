const assert = require('node:assert/strict')
const http = require('node:http')
const path = require('node:path')
const { after, before, mock, test } = require('node:test')

const express = require('express')
const passport = require('passport')
const { Strategy } = require('passport-local')
const config = require('@rm/config')

const { state } = require('./stateMock')

// Point this at a disposable MySQL/MariaDB database URL to run the suite against real SQL,
// the session_revocation_test table is created and dropped there
const scratchDatabase = process.env.REACTMAP_SESSION_TEST_DB
const mysql = scratchDatabase ? require('mysql2/promise') : null

const TABLE = 'session_revocation_test'

/**
 * Just enough of a MySQL table for the session store queries, rows are keyed by session ID
 */
function fakeDatabase() {
  const tables = new Map()
  const rows = (table) =>
    tables.get(table) || tables.set(table, new Map()).get(table)
  return {
    async query(sql, params) {
      await new Promise(setImmediate)
      switch (sql.split(' ')[0]) {
        case 'CREATE':
          return [{}]
        case 'SELECT': {
          const [data, expires, table, , sid] = params
          const found = rows(table).get(sid)
          return [found ? [{ data: found[data], expires: found[expires] }] : []]
        }
        case 'INSERT': {
          const [table, ...rest] = params
          const values = rest.slice(3, 6)
          if (
            rows(table).has(values[0]) &&
            !sql.includes('ON DUPLICATE KEY UPDATE')
          ) {
            throw new Error('Duplicate entry')
          }
          rows(table).set(
            values[0],
            Object.fromEntries(rest.slice(0, 3).map((c, i) => [c, values[i]])),
          )
          return [{ affectedRows: 1 }]
        }
        case 'UPDATE': {
          const [table, ...rest] = params
          const found = rows(table).get(rest.pop())
          rest.pop()
          for (let i = 0; found && i < rest.length; i += 2) {
            found[rest[i]] = rest[i + 1]
          }
          return [{ affectedRows: found ? 1 : 0 }]
        }
        case 'DELETE': {
          const [table, , sid] = params
          return [{ affectedRows: Number(rows(table).delete(sid)) }]
        }
        default:
          throw new Error(`Unsupported query: ${sql}`)
      }
    },
    end: async () => {},
  }
}

const database = scratchDatabase
  ? mysql.createPool(scratchDatabase)
  : fakeDatabase()

/** Queries of every worker's store, so tests can wait for fire-and-forget saves */
const inflight = new Set()
/**
 * The next store query starting with `verb` fails, or waits for `gate` when one is given
 * @type {{ verb: string, gate?: ReturnType<typeof gate> }[]}
 */
const faults = []

// express-mysql-session connects through mysql2, each store gets the shared table through this pool
mock.module(
  require.resolve('mysql2/promise', {
    paths: [path.dirname(require.resolve('express-mysql-session'))],
  }),
  {
    cache: true,
    namedExports: {
      createPool: () => {
        const connection = scratchDatabase
          ? mysql.createPool(scratchDatabase)
          : database
        return {
          query(sql, params) {
            const index = faults.findIndex(({ verb }) => sql.startsWith(verb))
            const [fault] = index === -1 ? [] : faults.splice(index, 1)
            const pending = fault
              ? fault.gate
                ? fault.gate.wait().then(() => connection.query(sql, params))
                : Promise.reject(new Error('store unavailable'))
              : connection.query(sql, params)
            inflight.add(pending)
            pending.catch(() => {}).finally(() => inflight.delete(pending))
            return pending
          },
          end: () =>
            connection === database ? Promise.resolve() : connection.end(),
        }
      },
    },
  },
)

function gate() {
  let enter
  let release
  const entered = new Promise((resolve) => {
    enter = resolve
  })
  const released = new Promise((resolve) => {
    release = resolve
  })
  return {
    entered,
    release,
    wait: (value) => {
      enter(value)
      return released
    },
  }
}

/** Pending holds, keyed by the part of a request they pause */
const holds = {}
/** Every call that reached the scanner backend */
const scans = []

mock.module(require.resolve('../src/services/scannerApi'), {
  cache: true,
  namedExports: {
    scannerApi: async (...args) => {
      scans.push(args)
      await holds.scanner?.wait()
      return { status: 'ok' }
    },
  },
})

const overrides = {
  'database.schemas': [{ host: 'scratch', useFor: ['user'] }],
  'database.settings.sessionTableName': TABLE,
  'api.sessionSecret': 'session revocation test',
  'api.cookieAgeDays': 1,
  'api.sessionCheckIntervalMs': 3_600_000,
  'authentication.strategies': [{ name: 'test', type: 'local', enabled: true }],
  'scanner.scanNext.userCooldownSeconds': 0,
  'scanner.scanNext.scanNextAreaRestriction': [],
}
const { getSafe } = config
mock.method(config, 'getSafe', (key) =>
  key in overrides ? overrides[key] : getSafe(key),
)

const perms = {
  map: true,
  devices: true,
  areaRestrictions: [],
  scanner: ['scanNext'],
  scannerCooldownBypass: [],
  webhooks: ['hook'],
}
const users = {
  revoked: { id: 1, username: 'revoked', perms, rmStrategy: 'test' },
  control: { id: 2, username: 'control', perms, rmStrategy: 'test' },
}
passport.use(
  'test',
  new Strategy((username, _password, done) => done(null, users[username])),
)

state.stats = {
  getValidApiEntries: () => [],
  pushApiEntry: () => {},
  hasApolloEntry: () => false,
  setApolloEntry: () => {},
  delAlertEntry: () => {},
}
state.event.webhookObj = { hook: {} }
state.db.query = async () => {
  await holds.map?.wait()
  return []
}
state.db.models.User = {
  updateWebhook: async (_id, selectedWebhook) => {
    await holds.webhook?.wait()
    return { selectedWebhook }
  },
}
state.db.models.Session = {
  isValidSession: async () => !holds.login,
  clearOtherSessions: async (_id, sid) => {
    await holds.login?.wait(sid)
    return 0
  },
}

const { sessionMiddleware } = require('../src/middleware/session')
const { initPassport } = require('../src/middleware/passport')
const { apolloMiddleware } = require('../src/middleware/apollo')
const { errorMiddleware } = require('../src/middleware/error')
const { authRouter } = require('../src/routes/authRouter')
const { startApollo } = require('../src/graphql/server')

const MAP = 'query Devices { devices { id } }'
const FAB = 'query FabButtons { fabButtons { webhooks } }'
const SCOUT =
  'query Scanner($data: JSON) { scanner(category: "scanNext", method: "GET", data: $data) { status } }'
const SCOUT_DATA = { data: { scanCoords: [[0, 0]] } }

/** Two app instances sharing the same session table, like two ReactMap processes */
const workers = []

async function startWorker() {
  const app = express()
  const server = http.createServer(app)
  const worker = { server, store: null, apollo: null, url: '' }
  app.use(sessionMiddleware(), express.json(), (req, _res, next) => {
    // the store is only reachable through a request
    worker.store = req.sessionStore
    next()
  })
  initPassport(app)
  app.use('/auth', authRouter)
  worker.apollo = await startApollo(server)
  app.use('/graphql', apolloMiddleware(worker.apollo))
  app.use(errorMiddleware)
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  worker.url = `http://127.0.0.1:${server.address().port}`
  await (await fetch(worker.url)).text()
  await worker.store.onReady()
  return worker
}

async function settled() {
  await Promise.allSettled(inflight)
  await new Promise(setImmediate)
  if (inflight.size) await settled()
}

async function login(worker, username) {
  const response = await fetch(`${worker.url}/auth/test/callback`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password: 'unused' }),
    redirect: 'manual',
  })
  await response.text()
  assert.equal(response.status, 302)
  return response.headers
    .getSetCookie()
    .find((cookie) => cookie.startsWith('reactmap1='))
    .split(';')[0]
}

async function gql(worker, cookie, query, variables) {
  const response = await fetch(`${worker.url}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ query, variables }),
    redirect: 'manual',
  })
  await response.text()
  return response.status
}

function sessionId(cookie) {
  const signed = decodeURIComponent(cookie.split('=')[1])
  return signed.slice(2, signed.lastIndexOf('.'))
}

async function row(sid) {
  const [[found]] = await database.query(
    'SELECT ?? AS data, ?? as expires FROM ?? WHERE ?? = ?',
    ['data', 'expires', TABLE, 'session_id', sid],
  )
  return found && { expires: found.expires, data: JSON.parse(found.data) }
}

/** Deletes the row the way every revocation path does */
function revoke(sid) {
  return database.query('DELETE FROM ?? WHERE ?? = ?', [
    TABLE,
    'session_id',
    sid,
  ])
}

function call(fn) {
  return new Promise((resolve, reject) => {
    fn((err, value) => (err ? reject(err) : resolve(value)))
  })
}

before(async () => {
  if (scratchDatabase) await database.query('DROP TABLE IF EXISTS ??', [TABLE])
  workers.push(await startWorker(), await startWorker())
})

after(async () => {
  await Promise.all(
    workers.map(async ({ apollo, store }) => {
      await apollo.stop()
      await store.close()
    }),
  )
  if (scratchDatabase) {
    await database.query('DROP TABLE IF EXISTS ??', [TABLE])
    await database.end()
  }
})

const heldRequests = [
  { name: 'a read-only map request', hold: 'map', query: MAP },
  { name: 'an explicit session save', hold: 'webhook', query: FAB },
  {
    name: 'a Scout cooldown write',
    hold: 'scanner',
    query: SCOUT,
    variables: SCOUT_DATA,
  },
]

heldRequests.forEach(({ name, hold, query, variables }) => {
  test(`${name} that finishes after revocation leaves the session revoked`, async () => {
    const revoked = await login(workers[0], 'revoked')
    const control = await login(workers[1], 'control')

    const paused = gate()
    holds[hold] = paused
    const held = gql(workers[0], revoked, query, variables)
    await paused.entered
    delete holds[hold]
    await revoke(sessionId(revoked))
    paused.release()
    assert.equal(await held, 200)
    await settled()

    const scanned = scans.length
    const statuses = await Promise.all(
      workers.map(async (worker) => ({
        map: await gql(worker, revoked, MAP),
        scout: await gql(worker, revoked, SCOUT, SCOUT_DATA),
        control: await gql(worker, control, MAP),
      })),
    )
    assert.deepEqual(
      { statuses, scans: scans.length - scanned },
      {
        statuses: workers.map(() => ({ map: 511, scout: 511, control: 200 })),
        scans: 0,
      },
    )
    assert.equal(await row(sessionId(revoked)), undefined)

    assert.equal(await gql(workers[1], control, SCOUT, SCOUT_DATA), 200)
    assert.equal(scans.length, scanned + 1)
  })
})

test('a new login revoked before its response is sent stays revoked', async () => {
  const paused = gate()
  holds.login = paused
  const pending = login(workers[0], 'revoked')
  const sid = await paused.entered
  delete holds.login
  await revoke(sid)
  paused.release()
  const cookie = await pending
  await settled()

  assert.equal(sessionId(cookie), sid)
  await Promise.all(
    workers.map(async (worker) => {
      assert.equal(await gql(worker, cookie, MAP), 511)
    }),
  )
  assert.equal(await row(sid), undefined)
})

test('logging out ends the session and a new login still works', async () => {
  const cookie = await login(workers[0], 'control')
  const response = await fetch(`${workers[0].url}/auth/logout`, {
    headers: { cookie },
    redirect: 'manual',
  })
  await response.text()
  assert.equal(response.status, 302)
  await settled()

  assert.equal(await gql(workers[1], cookie, MAP), 511)
  assert.equal(await row(sessionId(cookie)), undefined)
  const fresh = await login(workers[1], 'control')
  assert.equal(await gql(workers[0], fresh, MAP), 200)
})

test('a session that cannot be loaded does not reach Scout', async () => {
  const cookie = await login(workers[0], 'control')
  const scanned = scans.length
  faults.push({ verb: 'SELECT' })
  assert.notEqual(await gql(workers[1], cookie, SCOUT, SCOUT_DATA), 200)
  assert.equal(scans.length, scanned)
  assert.equal(await gql(workers[1], cookie, SCOUT, SCOUT_DATA), 200)
})

test('the store inserts a new session once and only updates it afterwards', async () => {
  const { store } = workers[0]
  const req = { sessionStore: store }
  store.generate(req)
  const sess = req.session

  const insert = gate()
  faults.push({ verb: 'INSERT', gate: insert })
  sess.step = 1
  const first = call((cb) => sess.save(cb))
  await insert.entered
  sess.step = 2
  const second = call((cb) => sess.save(cb))
  insert.release()
  await Promise.all([first, second])
  const stored = await row(sess.id)
  assert.equal(stored.data.step, 2)
  assert.equal(stored.expires, Math.round(sess.cookie.expires / 1000))

  const loaded = await call((cb) => store.load(sess.id, cb))
  await call((cb) => loaded.reload(cb))
  const reloaded = loaded.req.session
  assert.notEqual(reloaded, loaded)

  await revoke(sess.id)
  sess.step = 3
  reloaded.step = 3
  await call((cb) => sess.save(cb))
  await call((cb) => reloaded.save(cb))
  assert.equal(await row(sess.id), undefined)
  await assert.rejects(
    call((cb) => loaded.reload(cb)),
    /failed to load session/,
  )
})

test('a regenerated session gets its own row and the old one stays gone', async () => {
  const { store } = workers[0]
  const req = { sessionStore: store }
  store.generate(req)
  await call((cb) => req.session.save(cb))

  const loaded = await call((cb) => store.load(req.sessionID, cb))
  await call((cb) => loaded.regenerate(cb))
  const regenerated = loaded.req.session
  assert.notEqual(regenerated.id, loaded.id)
  regenerated.step = 1
  await call((cb) => regenerated.save(cb))
  await call((cb) => loaded.save(cb))

  assert.equal(await row(loaded.id), undefined)
  assert.equal((await row(regenerated.id)).data.step, 1)
})

test('failed session writes do not fall back to inserting', async () => {
  const { store } = workers[0]
  const req = { sessionStore: store }

  store.generate(req)
  const unsaved = req.session
  faults.push({ verb: 'INSERT' })
  await assert.rejects(
    call((cb) => unsaved.save(cb)),
    /store unavailable/,
  )
  await call((cb) => unsaved.save(cb))
  assert.equal(await row(unsaved.id), undefined)

  store.generate(req)
  req.session.step = 1
  await call((cb) => req.session.save(cb))
  const loaded = await call((cb) => store.load(req.sessionID, cb))
  loaded.step = 2
  faults.push({ verb: 'UPDATE' })
  await assert.rejects(
    call((cb) => loaded.save(cb)),
    /store unavailable/,
  )
  assert.equal((await row(loaded.id)).data.step, 1)
  await call((cb) => loaded.save(cb))
  assert.equal((await row(loaded.id)).data.step, 2)
})
