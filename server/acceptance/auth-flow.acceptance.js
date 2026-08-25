// server/acceptance/auth-flow.acceptance.js
//
// The seven acceptance criteria for the 2.0 Server Foundation plan
// (docs/superpowers/plans/2026-08-24-2-0-server-foundation.md), written
// before any of the plan's other tasks change production code. Almost
// everything here is expected to be RED right now -- that is the point.
// Every later task in the plan is judged by which of these lines turn
// green, so nothing in this file may be weakened to make that easier.
//
// Rules this file follows throughout:
//   - Every assertion is made against a real HTTP response from a real,
//     separately-running server process. Nothing here imports server
//     internals to check a return value directly.
//   - Every request carries an explicit client-side timeout, and every
//     criterion checks elapsed time, not just status. A response that
//     answers correctly and then holds the connection open is a failure
//     here, per criterion 7 -- this shipped once already on this branch
//     under the old Express entry, where `compression` sat ahead of
//     `toNodeHandler` and held a response open after it answered. The
//     2.0 entry (server/src/serve.js) has no middleware stack for that
//     class of bug to exist in, but the check stays.
//   - Database access in this file is only ever used to ARRANGE a
//     precondition (seed a legacy row, grant/revoke a permission) or to
//     CLEAN UP what this run created. It is never used as the assertion
//     itself -- every assertion reads a real HTTP response.
//
// Run with `bun test ./server/acceptance/auth-flow.acceptance.js` (see
// package.json's `test:acceptance` script). This file is deliberately
// named without ".test." in it so bare `bun test` -- the unit gate, 306
// tests -- does not pick it up; Bun only discovers "*.test.*"/"*.spec.*"
// files automatically, so this one only runs when asked for by path.
//
// Requires: a real MySQL reachable via the same REACT_MAP_DB_* variables
// server/src/serve.js uses (from .env), and API_SESSION_SECRET set (also
// from .env). Local sign-up/sign-in is enabled for the server process this
// file spawns via the AUTHENTICATION_STRATEGIES env var, which overrides
// config/default.json's `authentication.strategies` (disabled there) for
// this process only -- see config/custom-environment-variables.json. No
// checked-in config file is edited or written by this suite.

require('dotenv').config()

const path = require('path')
const crypto = require('crypto')
const mysql = require('mysql2/promise')
const { test, expect, describe, beforeAll, afterAll } = require('bun:test')

const REPO_ROOT = path.join(__dirname, '..', '..')

// A port the 8080 dev server can never be listening on, so this suite can
// never collide with a stray running instance.
const TEST_PORT = 18234
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`

// Every request gets this as its hard ceiling. If a request has not
// resolved by here, fetch aborts and the assertion fails with a message
// that says "hang", not "timeout" -- see timedFetch below.
const CLIENT_TIMEOUT_MS = 5_000

// Real work in this suite (a bcrypt sign-in, a settings read against a
// handful of rows) is sub-100ms on a local database. This is the "far
// below any client timeout" bar from criterion 7: generous enough not to
// flake on a loaded CI box, tight enough that a request approaching
// CLIENT_TIMEOUT_MS -- the actual hang this project shipped once -- fails
// loudly instead of reading as "a bit slow".
const HANG_THRESHOLD_MS = 2_000

const RUN_ID = crypto.randomBytes(4).toString('hex')
const emailFor = (label) =>
  `acceptance-${RUN_ID}-${label}@users.noreply.reactmap.invalid`
const usernameFor = (label) => `acceptance-${RUN_ID}-${label}`

/** @type {import('bun').Subprocess | null} */
let serverProcess = null
/** @type {import('mysql2/promise').Connection | null} */
let db = null

/** Legacy `users.id` rows this suite inserted, for cleanup. */
const legacyUserIds = []

/**
 * fetch with an explicit abort timeout and elapsed-time measurement. Every
 * HTTP call in this suite goes through this, because criterion 7 is about
 * every auth response, not a single dedicated check.
 *
 * @param {string} url
 * @param {RequestInit} [options]
 */
async function timedFetch(url, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS)
  const start = performance.now()
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    const text = await response.text()
    const elapsedMs = performance.now() - start
    let json
    try {
      json = text ? JSON.parse(text) : undefined
    } catch {
      json = undefined
    }
    return { response, text, json, elapsedMs }
  } catch (e) {
    const elapsedMs = performance.now() - start
    if (e?.name === 'AbortError') {
      throw new Error(
        `${url} did not complete within ${CLIENT_TIMEOUT_MS}ms (elapsed ${elapsedMs.toFixed(0)}ms). ` +
          'This is a hang, not a slow response -- see criterion 7.',
      )
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

function getSessionCookie(response) {
  const raw = response.headers.get('set-cookie')
  if (!raw) return null
  const [pair] = raw.split(';')
  return pair
}

/**
 * Polls /api/health until the server answers or `maxWaitMs` elapses.
 */
async function waitForServerReady(maxWaitMs) {
  const deadline = Date.now() + maxWaitMs
  let lastError
  while (Date.now() < deadline) {
    try {
      const { response } = await timedFetch(`${BASE_URL}/api/health`)
      if (response.status === 200) return
    } catch (e) {
      lastError = e
    }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
  throw new Error(
    `Server did not become ready on ${BASE_URL} within ${maxWaitMs}ms. Last error: ${lastError}`,
  )
}

beforeAll(async () => {
  db = await mysql.createConnection({
    host: process.env.REACT_MAP_DB_HOST,
    port: Number(process.env.REACT_MAP_DB_PORT),
    user: process.env.REACT_MAP_DB_USERNAME,
    password: process.env.REACT_MAP_DB_PASSWORD,
    database: process.env.REACT_MAP_DB_NAME,
  })

  serverProcess = Bun.spawn({
    cmd: ['bun', 'server/src/serve.js'],
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      INTERFACE: '127.0.0.1',
      // Local strategy is disabled in config/default.json by design; this
      // is the injection seam (an env var config/custom-environment-variables.json
      // already maps to authentication.strategies) that turns it on for
      // this one process without touching any checked-in config file.
      AUTHENTICATION_STRATEGIES: JSON.stringify([
        { name: 'local', type: 'local', enabled: true },
      ]),
      // Avoids this suite's boot time depending on GitHub/update-check
      // network calls, which have nothing to do with what is under test.
      DEV_OPTIONS_SKIP_UPDATE_CHECK: 'true',
    },
    stdout: 'pipe',
    stderr: 'pipe',
  })

  await waitForServerReady(45_000)
}, 60_000)

afterAll(async () => {
  if (serverProcess) {
    serverProcess.kill()
    await serverProcess.exited
  }
  if (db) {
    // Clean up everything this run created, in FK-safe order.
    await db.query(
      `DELETE FROM auth_session WHERE user_id IN (SELECT id FROM auth_user WHERE email LIKE ?)`,
      [`acceptance-${RUN_ID}-%`],
    )
    await db.query(
      `DELETE FROM auth_account WHERE user_id IN (SELECT id FROM auth_user WHERE email LIKE ?)`,
      [`acceptance-${RUN_ID}-%`],
    )
    await db.query(
      `DELETE FROM user_perms WHERE user_id IN (SELECT id FROM auth_user WHERE email LIKE ?)`,
      [`acceptance-${RUN_ID}-%`],
    )
    await db.query(`DELETE FROM auth_user WHERE email LIKE ?`, [
      `acceptance-${RUN_ID}-%`,
    ])
    if (legacyUserIds.length) {
      // Criterion 6's auth_user row is created by the real back-fill
      // script, not by this suite's sign-up calls, so its email is the
      // script's own derived placeholder rather than one matching
      // `acceptance-${RUN_ID}-%` above. It is still ours to clean up: it
      // carries the legacy_id of a row this suite inserted, and every FK
      // that hangs off auth_user.id (auth_session, auth_account,
      // user_perms) cascades on delete, so this one statement is enough.
      await db.query(`DELETE FROM auth_user WHERE legacy_id IN (?)`, [
        legacyUserIds,
      ])
      await db.query(`DELETE FROM users WHERE id IN (?)`, [legacyUserIds])
    }
    await db.end()
  }
}, 30_000)

// ---------------------------------------------------------------------------
// Criterion 1: a user created through Better Auth can sign in and receives
// a session cookie.
// ---------------------------------------------------------------------------
describe('criterion 1: sign-up then sign-in yields a session cookie', () => {
  const username = usernameFor('c1')
  const password = 'correct horse battery staple 1'

  test('a freshly created account can sign in over HTTP and gets a session cookie', async () => {
    const signUp = await timedFetch(`${BASE_URL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailFor('c1'),
        password,
        name: username,
        username,
      }),
    })
    expect(signUp.response.status).toBe(200)
    expect(signUp.elapsedMs).toBeLessThan(HANG_THRESHOLD_MS)

    const signIn = await timedFetch(`${BASE_URL}/api/auth/sign-in/username`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    expect(signIn.response.status).toBe(200)
    expect(signIn.elapsedMs).toBeLessThan(HANG_THRESHOLD_MS)

    const cookie = getSessionCookie(signIn.response)
    expect(cookie).not.toBeNull()
    expect(cookie).toMatch(/session_token/)
  })
})

// ---------------------------------------------------------------------------
// Criterion 2: that cookie, presented to /api/settings, yields a response
// identifying the caller as logged in with their permissions attached.
// ---------------------------------------------------------------------------
describe('criterion 2: the session cookie identifies the caller on /api/settings', () => {
  const username = usernameFor('c2')
  const password = 'correct horse battery staple 2'
  let cookie
  let userId

  beforeAll(async () => {
    const signUp = await timedFetch(`${BASE_URL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailFor('c2'),
        password,
        name: username,
        username,
      }),
    })
    userId = signUp.json?.user?.id

    const signIn = await timedFetch(`${BASE_URL}/api/auth/sign-in/username`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    cookie = getSessionCookie(signIn.response)

    // Grants a permission directly in the row /api/settings reads from, as
    // an ARRANGE step. Task 4 landed: the sign-in above already triggered a
    // real recompute and wrote its own `credential` row (a default config
    // grants no perm to anyone, so that row exists but is all-false). This
    // forces `map: true` deterministically for the READ-path assertion
    // below, which is what this test is actually about -- an upsert rather
    // than a plain INSERT, because the row this overwrites is now expected
    // to already exist, not a sign that anything is broken.
    await db.query(
      `INSERT INTO user_perms (id, user_id, provider_id, perms) VALUES (?, ?, 'credential', ?)
       ON DUPLICATE KEY UPDATE perms = VALUES(perms)`,
      [
        crypto.randomUUID().replace(/-/g, '').slice(0, 36),
        userId,
        JSON.stringify({ map: true }),
      ],
    )
  })

  test('the response identifies the caller as logged in, by username, with permissions attached', async () => {
    const settings = await timedFetch(`${BASE_URL}/api/settings`, {
      headers: { Cookie: cookie },
    })
    expect(settings.response.status).toBe(200)
    expect(settings.elapsedMs).toBeLessThan(HANG_THRESHOLD_MS)
    expect(settings.json.user.loggedIn).toBe(true)
    expect(settings.json.user.username).toBe(username)
    expect(settings.json.user.perms).toEqual(
      expect.objectContaining({ map: true }),
    )
  })

  // The test above proves the READ path: a permission that exists in
  // user_perms reaches the client. It cannot prove the criterion as written,
  // because its ARRANGE step supplies the very thing the system is meant to
  // produce. Asserting the artifact a step produced rather than the outcome it
  // exists for is how three Criticals were reported closed while still broken
  // on this branch.
  //
  // So this one takes the seed away. It is red until permissions are computed
  // for credential sign-ins, and it must stay red rather than be made green by
  // seeding.
  test('a user who signs in has permissions without anyone seeding them', async () => {
    const solo = usernameFor('c2solo')
    await timedFetch(`${BASE_URL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailFor('c2solo'),
        password,
        name: solo,
        username: solo,
      }),
    })
    const signIn = await timedFetch(`${BASE_URL}/api/auth/sign-in/username`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: solo, password }),
    })
    const settings = await timedFetch(`${BASE_URL}/api/settings`, {
      headers: { Cookie: getSessionCookie(signIn.response) },
    })
    expect(settings.json.user.loggedIn).toBe(true)
    expect(Object.keys(settings.json.user.perms || {}).length).toBeGreaterThan(
      0,
    )
  })
})

// ---------------------------------------------------------------------------
// Criterion 3: a user with no session gets an anonymous /api/settings
// response, not an error.
// ---------------------------------------------------------------------------
describe('criterion 3: no session cookie yields an anonymous, not an error, response', () => {
  test('/api/settings answers 200 with loggedIn: false when no cookie is sent', async () => {
    const settings = await timedFetch(`${BASE_URL}/api/settings`)
    expect(settings.response.status).toBe(200)
    expect(settings.elapsedMs).toBeLessThan(HANG_THRESHOLD_MS)
    expect(settings.json.user.loggedIn).toBe(false)
    expect(settings.json.authentication.loggedIn).toBe(false)
  })

  test('/api/settings answers 200 with loggedIn: false for a garbage/expired cookie, not a 401 or 500', async () => {
    const settings = await timedFetch(`${BASE_URL}/api/settings`, {
      headers: { Cookie: 'better-auth.session_token=not-a-real-token' },
    })
    expect(settings.response.status).toBe(200)
    expect(settings.elapsedMs).toBeLessThan(HANG_THRESHOLD_MS)
    expect(settings.json.user.loggedIn).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Criterion 4: a user whose Discord account is in a blocked guild cannot
// obtain a session. PENDING -- see comment below for exactly why and what
// closes the gap.
// ---------------------------------------------------------------------------
describe('criterion 4: a blocked-guild Discord account cannot obtain a session', () => {
  // This cannot be driven honestly right now, over real HTTP, without
  // stubbing the thing under test.
  //
  // 2.0 keeps a Discord bot (server/src/auth/discord-bot-client.js):
  // guild membership and role data now come from the bot's gateway
  // connection (server/src/auth/discord-roles.js), not from an OAuth
  // `guilds` scope -- that scope was removed entirely. `blockedGuilds` and
  // `allowedGuilds` are evaluated for real against whatever the bot
  // reports (server/src/auth/discord-perms.js). But this environment has
  // no bot token and cannot reach Discord's gateway at all, so there is no
  // way to get a real Discord account into a real blocked guild's member
  // list over HTTP here. Without a bot connection, `computeDiscordPerms`
  // sees every relevant guild as `unknown` and skips the row rather than
  // deny -- correct behaviour for an unreachable bot, but it means this
  // criterion cannot be exercised end-to-end without either real Discord
  // bot credentials in a guild configured as `blockedGuilds`, or a test
  // seam that injects a fake bot client through the real HTTP sign-in
  // flow (the pure function and the bot-client adapter each already have
  // unit tests that inject a fake client this way; what is missing is
  // wiring that same injection point through a live `/api/auth/*` request).
  test.skip('a Discord account in a blocked guild is refused a session (pending: no Discord bot credentials in this environment -- see comment above)', async () => {
    throw new Error('not runnable in this environment yet -- see comment above')
  })
})

// ---------------------------------------------------------------------------
// Criterion 5: a user whose permissions are revoked stops seeing those
// permissions on the next request.
// ---------------------------------------------------------------------------
describe('criterion 5: a revoked permission stops appearing on the next request', () => {
  // The ARRANGE and the "revoke" step below both write to user_perms
  // directly, because nothing in the current stack can trigger a
  // revocation over HTTP or from a real event yet: the only code that
  // calls `revokeProviderAccess` (server/src/auth/revoke-access-adapter.js)
  // is 1.x's Discord client, which this plan forbids wiring into the 2.0
  // server (and which Task 7 removed from this branch entirely), and 1.x's
  // trial service, which needs a live trial window and provider account to
  // exercise and was removed the same way.
  //
  // Task 4 landed, and it gave `credential` its own real recompute -- which
  // is exactly why this row is written under a synthetic `manual-grant`
  // provider id instead: `/api/settings` merges every user_perms row
  // regardless of provider (`mergePerms` in
  // server/src/settings-response.js), but a real `credential` row now
  // gets recomputed to a fresh, config-derived value on every sign-in (see
  // criterion 2's identical situation), which would silently overwrite this
  // test's manual "revoke" write the moment `signInAndGetSettings` below
  // signs in again. `manual-grant` is not a provider any computer recomputes,
  // so it survives exactly as long as this test controls it -- the same
  // property `credential` had before Task 4, now moved to a name that
  // documents why it has to stay untouched here.
  //
  // What this test DOES verify honestly, over real HTTP: that a fresh
  // /api/settings request reads live from user_perms rather than serving a
  // stale/cached view of a permission from an earlier request in the same
  // session -- the actual outcome criterion 5 cares about once something
  // real removes the row.
  const username = usernameFor('c5')
  const password = 'correct horse battery staple 5'
  let userId
  let permRowId

  beforeAll(async () => {
    const signUp = await timedFetch(`${BASE_URL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailFor('c5'),
        password,
        name: username,
        username,
      }),
    })
    userId = signUp.json?.user?.id
    permRowId = crypto.randomUUID().replace(/-/g, '').slice(0, 36)
    await db.query(
      `INSERT INTO user_perms (id, user_id, provider_id, perms) VALUES (?, ?, 'manual-grant', ?)`,
      [permRowId, userId, JSON.stringify({ map: true, pokemon: true })],
    )
  })

  async function signInAndGetSettings() {
    const signIn = await timedFetch(`${BASE_URL}/api/auth/sign-in/username`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const cookie = getSessionCookie(signIn.response)
    return timedFetch(`${BASE_URL}/api/settings`, {
      headers: { Cookie: cookie },
    })
  }

  test('the permission is visible before revocation', async () => {
    const settings = await signInAndGetSettings()
    expect(settings.response.status).toBe(200)
    expect(settings.elapsedMs).toBeLessThan(HANG_THRESHOLD_MS)
    expect(settings.json.user.perms.pokemon).toBe(true)
  })

  test('the permission is gone on the next request after it is revoked', async () => {
    await db.query(`UPDATE user_perms SET perms = ? WHERE id = ?`, [
      JSON.stringify({ map: true, pokemon: false }),
      permRowId,
    ])
    const settings = await signInAndGetSettings()
    expect(settings.response.status).toBe(200)
    expect(settings.elapsedMs).toBeLessThan(HANG_THRESHOLD_MS)
    expect(settings.json.user.perms.pokemon).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Criterion 6: a user migrated from a 1.x table by the migration script can
// sign in with their existing password.
// ---------------------------------------------------------------------------
describe('criterion 6: a migrated legacy user can sign in with their existing password', () => {
  // Task 6 extracted the back-fill out of `migrate:latest` into
  // server/src/scripts/backfill-auth-users.js, an operator-invoked script.
  // This test seeds a legacy row, runs that script exactly the way an
  // operator would (a real subprocess, not an imported function), and only
  // then drives the real sign-in endpoint -- so this is a true end-to-end
  // check of the path an operator actually has, not of an internal.
  const legacyUsername = usernameFor('c6-legacy')
  const legacyPassword = 'a legacy password from 1.x'

  beforeAll(async () => {
    const hash = await Bun.password.hash(legacyPassword, {
      algorithm: 'bcrypt',
      cost: 10,
    })
    const [result] = await db.query(
      `INSERT INTO users (username, password) VALUES (?, ?)`,
      [legacyUsername, hash],
    )
    legacyUserIds.push(result.insertId)

    const backfillProcess = Bun.spawn({
      cmd: ['bun', 'server/src/scripts/backfill-auth-users.js'],
      cwd: REPO_ROOT,
      env: process.env,
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const exitCode = await backfillProcess.exited
    if (exitCode !== 0) {
      const stderr = await new Response(backfillProcess.stderr).text()
      throw new Error(
        `backfill-auth-users.js exited ${exitCode}, expected 0:\n${stderr}`,
      )
    }
  }, 30_000)

  test('signing in with the legacy username/password succeeds', async () => {
    const signIn = await timedFetch(`${BASE_URL}/api/auth/sign-in/username`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: legacyUsername,
        password: legacyPassword,
      }),
    })
    expect(signIn.elapsedMs).toBeLessThan(HANG_THRESHOLD_MS)
    expect(signIn.response.status).toBe(200)
    expect(signIn.json?.user?.username).toBe(legacyUsername)
  })
})

// ---------------------------------------------------------------------------
// Criterion 7: auth responses complete, with time_total far below any
// client timeout. Checked inline on every request above; this block
// re-asserts it explicitly and in one place, per the plan's requirement
// that this be checked explicitly rather than incidentally.
// ---------------------------------------------------------------------------
describe('criterion 7: auth and settings responses complete well inside the client timeout', () => {
  test('a health check completes fast', async () => {
    const { response, elapsedMs } = await timedFetch(`${BASE_URL}/api/health`)
    expect(response.status).toBe(200)
    expect(elapsedMs).toBeLessThan(HANG_THRESHOLD_MS)
  })

  test('an anonymous settings request completes fast', async () => {
    const { response, elapsedMs } = await timedFetch(`${BASE_URL}/api/settings`)
    expect(response.status).toBe(200)
    expect(elapsedMs).toBeLessThan(HANG_THRESHOLD_MS)
  })

  test('a sign-in request completes fast and does not hang the connection open', async () => {
    const username = usernameFor('c7')
    const password = 'correct horse battery staple 7'
    await timedFetch(`${BASE_URL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailFor('c7'),
        password,
        name: username,
        username,
      }),
    })
    const { response, elapsedMs } = await timedFetch(
      `${BASE_URL}/api/auth/sign-in/username`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      },
    )
    expect(response.status).toBe(200)
    // A request that takes approximately exactly CLIENT_TIMEOUT_MS is a
    // hang, and timedFetch already turns that into a thrown error rather
    // than a slow-but-passing result -- this bound is the second,
    // independent check that a *fast* hang (one just under the abort
    // boundary) still fails loudly rather than reading as "acceptable".
    expect(elapsedMs).toBeLessThan(HANG_THRESHOLD_MS)
  })
})
